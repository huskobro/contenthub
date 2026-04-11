"""
YouTube Video Management Router — Sprint 2 / Faz YT-VM1.

Post-publish video management endpoints:
  - PUT    /publish/youtube/video/{video_id}           : Update title/description/tags/category/privacy
  - POST   /publish/youtube/video/{video_id}/thumbnail : Upload custom thumbnail (thumbnails.set)
  - GET    /publish/youtube/video/{video_id}/captions  : List caption tracks
  - POST   /publish/youtube/video/{video_id}/captions  : Upload a new caption track (captions.insert)
  - DELETE /publish/youtube/video/{video_id}/captions/{caption_id} : Remove a caption track

All endpoints:
  - Require an existing YouTube PlatformConnection (passed via connection_id query).
  - Use the per-connection DBYouTubeTokenStore to obtain a fresh access token.
  - Proxy to YouTube Data API v3 with the "youtube" + "youtube.force-ssl" scope set
    that was already requested at OAuth time.
  - Write audit log entries for every mutation.
  - Gated behind the `panel:publish` visibility key so admins can hide them
    entirely through the Visibility Engine.

NOT included here (by design):
  - Upload flow (handled by `YouTubeAdapter.upload` inside PublishAdapter chain)
  - Analytics (handled by YouTubeAnalyticsService + analytics router)
  - Comment moderation (Sprint 3)
  - Playlist / branding (Sprint 3)

Safety:
  - Thumbnail uploads are size-limited to 2 MB (YouTube hard limit).
  - Caption uploads are size-limited to 5 MB and must be SRT or VTT text.
  - Videos.update only touches a whitelisted set of snippet/status fields.
"""

from __future__ import annotations

import json
import logging
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.db.models import PlatformConnection
from app.db.session import get_db
from app.publish.youtube.errors import (
    YouTubeAuthError,
    YouTubeQuotaExceededError,
    YouTubeRateLimitError,
    YouTubeVideoNotFoundError,
)
from app.publish.youtube.token_store import DBYouTubeTokenStore
from app.visibility.dependencies import require_visible

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/publish/youtube/video",
    tags=["publish-youtube-video-management"],
    dependencies=[Depends(require_visible("panel:publish"))],
)

_token_store = DBYouTubeTokenStore()

# YouTube Data API v3 endpoint bases
_YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
_YT_THUMBNAILS_URL = "https://www.googleapis.com/upload/youtube/v3/thumbnails/set"
_YT_CAPTIONS_URL = "https://www.googleapis.com/youtube/v3/captions"
_YT_CAPTIONS_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/captions"

# Limits
_THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
_CAPTION_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
_ALLOWED_THUMBNAIL_TYPES = {"image/jpeg", "image/png"}
_ALLOWED_CAPTION_TYPES = {
    "application/x-subrip",
    "text/vtt",
    "text/plain",
    "application/octet-stream",  # curl default, still validated by extension
}
_ALLOWED_CAPTION_EXTENSIONS = {".srt", ".vtt", ".sbv"}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class VideoUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=5000)
    tags: Optional[List[str]] = None
    category_id: Optional[str] = None
    privacy_status: Optional[str] = Field(
        None,
        description="public | unlisted | private",
        pattern="^(public|unlisted|private)$",
    )
    made_for_kids: Optional[bool] = None
    embeddable: Optional[bool] = None
    public_stats_viewable: Optional[bool] = None


class VideoUpdateResponse(BaseModel):
    status: str
    video_id: str
    updated_fields: List[str]
    message: str


class ThumbnailSetResponse(BaseModel):
    status: str
    video_id: str
    thumbnail_urls: dict
    message: str


class CaptionRow(BaseModel):
    id: str
    language: str
    name: str
    is_draft: bool
    is_auto: bool
    last_updated: Optional[str] = None


class CaptionListResponse(BaseModel):
    video_id: str
    captions: List[CaptionRow]


class CaptionUploadResponse(BaseModel):
    status: str
    caption_id: str
    language: str
    name: str
    message: str


class CaptionDeleteResponse(BaseModel):
    status: str
    caption_id: str
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_connection(
    db: AsyncSession, connection_id: str
) -> PlatformConnection:
    conn = await db.get(PlatformConnection, connection_id)
    if not conn or conn.platform != "youtube":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"YouTube baglantisi bulunamadi: {connection_id}",
        )
    if conn.requires_reauth:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="YouTube baglantisi yeniden yetkilendirme gerektiriyor.",
        )
    return conn


async def _get_access_token(db: AsyncSession, conn: PlatformConnection) -> str:
    try:
        return await _token_store.get_access_token(db, conn.id)
    except YouTubeAuthError as exc:
        logger.warning(
            "YouTube access token alinamadi: connection=%s error=%s", conn.id, exc
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )


def _parse_error(response: httpx.Response) -> tuple[str, str]:
    try:
        body = response.json()
        error = body.get("error", {})
        errors = error.get("errors", [{}])
        reason = errors[0].get("reason", "unknown") if errors else "unknown"
        message = error.get("message", response.text[:200])
        return reason, message
    except Exception:
        return "unknown", response.text[:200]


def _raise_for_yt_status(response: httpx.Response, video_id: str) -> None:
    """Translate YouTube API HTTP errors into HTTPException."""
    if response.status_code in (200, 201, 204):
        return
    reason, message = _parse_error(response)
    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"YouTube kimlik hatasi ({reason}): {message}",
        )
    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video veya kaynak bulunamadi (video_id={video_id}): {message}",
        )
    if response.status_code == 429:
        if reason == "quotaExceeded":
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"YouTube gunluk kota asildi: {message}",
            )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"YouTube rate limit: {message}",
        )
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"YouTube API hatasi (HTTP {response.status_code}, {reason}): {message}",
    )


# ---------------------------------------------------------------------------
# PUT /video/{video_id} — videos.update (whitelisted fields)
# ---------------------------------------------------------------------------


@router.put("/{video_id}", response_model=VideoUpdateResponse)
async def update_video(
    video_id: str,
    body: VideoUpdateRequest,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a previously published video's metadata.

    Only the fields present in the request body are sent to YouTube. The
    endpoint reads the existing snippet first so partial updates don't wipe
    unrelated fields.
    """
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    # Read current snippet + status
    async with httpx.AsyncClient(timeout=30.0) as client:
        get_resp = await client.get(
            _YT_VIDEOS_URL,
            params={"part": "snippet,status", "id": video_id},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(get_resp, video_id)
    items = get_resp.json().get("items", [])
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video bulunamadi: {video_id}",
        )

    current = items[0]
    snippet = dict(current.get("snippet") or {})
    status_block = dict(current.get("status") or {})

    updated_fields: List[str] = []

    if body.title is not None:
        snippet["title"] = body.title
        updated_fields.append("title")
    if body.description is not None:
        snippet["description"] = body.description
        updated_fields.append("description")
    if body.tags is not None:
        snippet["tags"] = list(body.tags)
        updated_fields.append("tags")
    if body.category_id is not None:
        snippet["categoryId"] = str(body.category_id)
        updated_fields.append("category_id")

    if body.privacy_status is not None:
        status_block["privacyStatus"] = body.privacy_status
        updated_fields.append("privacy_status")
    if body.made_for_kids is not None:
        status_block["selfDeclaredMadeForKids"] = bool(body.made_for_kids)
        updated_fields.append("made_for_kids")
    if body.embeddable is not None:
        status_block["embeddable"] = bool(body.embeddable)
        updated_fields.append("embeddable")
    if body.public_stats_viewable is not None:
        status_block["publicStatsViewable"] = bool(body.public_stats_viewable)
        updated_fields.append("public_stats_viewable")

    if not updated_fields:
        return VideoUpdateResponse(
            status="noop",
            video_id=video_id,
            updated_fields=[],
            message="Guncellenecek alan yok.",
        )

    # YouTube requires categoryId + title when sending snippet.
    if "title" not in snippet:
        snippet["title"] = current.get("snippet", {}).get("title", "")
    if "categoryId" not in snippet:
        snippet["categoryId"] = current.get("snippet", {}).get("categoryId", "22")

    resource = {"id": video_id, "snippet": snippet, "status": status_block}

    async with httpx.AsyncClient(timeout=30.0) as client:
        put_resp = await client.put(
            _YT_VIDEOS_URL,
            params={"part": "snippet,status"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            content=json.dumps(resource, ensure_ascii=False).encode(),
        )
    _raise_for_yt_status(put_resp, video_id)

    await write_audit_log(
        db,
        action="youtube.video.update",
        entity_type="youtube_video",
        entity_id=video_id,
        details={"connection_id": conn.id, "fields": updated_fields},
    )
    logger.info(
        "YouTube video guncellendi: video_id=%s fields=%s connection=%s",
        video_id, updated_fields, conn.id,
    )
    return VideoUpdateResponse(
        status="ok",
        video_id=video_id,
        updated_fields=updated_fields,
        message="Video guncellendi.",
    )


# ---------------------------------------------------------------------------
# POST /video/{video_id}/thumbnail — thumbnails.set
# ---------------------------------------------------------------------------


@router.post("/{video_id}/thumbnail", response_model=ThumbnailSetResponse)
async def set_video_thumbnail(
    video_id: str,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    file: UploadFile = File(..., description="JPEG veya PNG thumbnail (max 2 MB)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a custom thumbnail for an already-published YouTube video.

    YouTube limits: 2 MB max, JPG/PNG only, 16:9 recommended (1280x720).
    """
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_THUMBNAIL_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Yalnizca JPEG veya PNG thumbnail kabul edilir.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thumbnail dosyasi bos.",
        )
    if len(data) > _THUMBNAIL_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Thumbnail 2 MB sinirini asiyor ({len(data)} bytes).",
        )

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            _YT_THUMBNAILS_URL,
            params={"videoId": video_id, "uploadType": "media"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": content_type,
            },
            content=data,
        )
    _raise_for_yt_status(resp, video_id)

    payload = resp.json() if resp.content else {}
    thumbnails = payload.get("items", [{}])[0] if payload.get("items") else {}

    await write_audit_log(
        db,
        action="youtube.video.thumbnail_set",
        entity_type="youtube_video",
        entity_id=video_id,
        details={"connection_id": conn.id, "bytes": len(data)},
    )
    logger.info(
        "YouTube thumbnail guncellendi: video_id=%s bytes=%d connection=%s",
        video_id, len(data), conn.id,
    )
    return ThumbnailSetResponse(
        status="ok",
        video_id=video_id,
        thumbnail_urls=thumbnails,
        message="Thumbnail guncellendi.",
    )


# ---------------------------------------------------------------------------
# Captions — list / insert / delete
# ---------------------------------------------------------------------------


@router.get("/{video_id}/captions", response_model=CaptionListResponse)
async def list_video_captions(
    video_id: str,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """List caption tracks attached to a video."""
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            _YT_CAPTIONS_URL,
            params={"part": "snippet", "videoId": video_id},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(resp, video_id)

    items = resp.json().get("items", [])
    rows: List[CaptionRow] = []
    for item in items:
        snip = item.get("snippet", {})
        rows.append(
            CaptionRow(
                id=item.get("id", ""),
                language=snip.get("language", ""),
                name=snip.get("name", ""),
                is_draft=bool(snip.get("isDraft", False)),
                is_auto=(snip.get("trackKind") == "ASR"),
                last_updated=snip.get("lastUpdated"),
            )
        )

    return CaptionListResponse(video_id=video_id, captions=rows)


@router.post("/{video_id}/captions", response_model=CaptionUploadResponse)
async def upload_video_caption(
    video_id: str,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    language: str = Form(..., description="BCP-47 dil kodu (tr, en, en-US...)"),
    name: str = Form("", description="Altyazi adi, bos bırakilirsa 'Default'"),
    is_draft: bool = Form(False),
    file: UploadFile = File(..., description="SRT/VTT/SBV altyazi dosyasi (max 5 MB)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a new caption track via captions.insert.

    YouTube accepts SRT, VTT (WebVTT), or SBV. File extension drives format
    detection. Stored draft captions don't appear on the video until toggled.
    """
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    filename = (file.filename or "").lower()
    ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ""
    if ext not in _ALLOWED_CAPTION_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Desteklenmeyen altyazi uzantisi: {ext or '(yok)'} (izin: .srt .vtt .sbv)",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Altyazi dosyasi bos.",
        )
    if len(data) > _CAPTION_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Altyazi 5 MB sinirini asiyor ({len(data)} bytes).",
        )

    snippet = {
        "snippet": {
            "videoId": video_id,
            "language": language,
            "name": name or "Default",
            "isDraft": bool(is_draft),
        }
    }

    # Multipart related upload: metadata JSON + caption body
    boundary = "----contenthub_caption_boundary"
    body_parts = [
        f"--{boundary}".encode(),
        b"Content-Type: application/json; charset=UTF-8",
        b"",
        json.dumps(snippet, ensure_ascii=False).encode(),
        f"--{boundary}".encode(),
        b"Content-Type: */*",
        b"",
        data,
        f"--{boundary}--".encode(),
    ]
    body_bytes = b"\r\n".join(body_parts)

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            _YT_CAPTIONS_UPLOAD_URL,
            params={"part": "snippet", "uploadType": "multipart"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": f"multipart/related; boundary={boundary}",
            },
            content=body_bytes,
        )
    _raise_for_yt_status(resp, video_id)

    payload = resp.json() if resp.content else {}
    caption_id = payload.get("id", "")

    await write_audit_log(
        db,
        action="youtube.video.caption_insert",
        entity_type="youtube_video",
        entity_id=video_id,
        details={
            "connection_id": conn.id,
            "caption_id": caption_id,
            "language": language,
            "bytes": len(data),
        },
    )
    logger.info(
        "YouTube caption eklendi: video_id=%s caption_id=%s lang=%s connection=%s",
        video_id, caption_id, language, conn.id,
    )
    return CaptionUploadResponse(
        status="ok",
        caption_id=caption_id,
        language=language,
        name=name or "Default",
        message="Altyazi yuklendi.",
    )


@router.delete(
    "/{video_id}/captions/{caption_id}",
    response_model=CaptionDeleteResponse,
)
async def delete_video_caption(
    video_id: str,
    caption_id: str,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """Delete a caption track (captions.delete)."""
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.delete(
            _YT_CAPTIONS_URL,
            params={"id": caption_id},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(resp, video_id)

    await write_audit_log(
        db,
        action="youtube.video.caption_delete",
        entity_type="youtube_video",
        entity_id=video_id,
        details={"connection_id": conn.id, "caption_id": caption_id},
    )
    logger.info(
        "YouTube caption silindi: video_id=%s caption_id=%s connection=%s",
        video_id, caption_id, conn.id,
    )
    return CaptionDeleteResponse(
        status="ok",
        caption_id=caption_id,
        message="Altyazi silindi.",
    )
