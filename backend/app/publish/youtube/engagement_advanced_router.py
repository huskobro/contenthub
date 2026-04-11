"""
YouTube Engagement & Playlist Advanced Router — Sprint 3.

Three self-contained feature areas, all using the per-connection
DBYouTubeTokenStore (same pattern as video_management_router.py):

  1) Comment moderation
     - POST /publish/youtube/comments/{comment_id}/moderation
       (comments.setModerationStatus: published | heldForReview | rejected,
        optional banAuthor)
     - POST /publish/youtube/comments/{comment_id}/spam
       (comments.markAsSpam)

  2) Playlist advanced operations
     - PUT    /publish/youtube/playlists/{external_playlist_id}
       (playlists.update snippet/status)
     - DELETE /publish/youtube/playlists/{external_playlist_id}
       (playlists.delete)
     - POST   /publish/youtube/playlist-items/{external_item_id}/position
       (playlistItems.update to reorder within the playlist)

  3) Channel branding
     - PUT /publish/youtube/channel/branding
       (channels.update brandingSettings: title, description, keywords,
        featuredChannels, unsubscribedTrailer)

All endpoints:
  - Require `connection_id` (PlatformConnection.id) via query parameter.
  - Hide behind the `panel:publish` visibility key.
  - Write an audit log entry on every mutation.
  - Translate YouTube API errors into ContentHub HTTPException codes
    (401, 404, 429, 502) via a shared `_raise_for_yt_status` helper.

Scope note: These endpoints are thin proxies. They intentionally do not
touch the existing comments/playlists SyncedX tables — those are kept in
sync by the separate /comments and /playlists routers. The advanced
endpoints simply mutate the YouTube-side resource and audit the action;
a subsequent sync pass will refresh local rows.
"""

from __future__ import annotations

import json
import logging
from typing import List, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.db.models import PlatformConnection
from app.db.session import get_db
from app.publish.youtube.errors import YouTubeAuthError
from app.publish.youtube.token_store import DBYouTubeTokenStore
from app.visibility.dependencies import require_visible

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/publish/youtube",
    tags=["publish-youtube-engagement-advanced"],
    dependencies=[Depends(require_visible("panel:publish"))],
)

_token_store = DBYouTubeTokenStore()

# YouTube Data API v3 endpoint bases
_YT_COMMENTS_URL = "https://www.googleapis.com/youtube/v3/comments"
_YT_COMMENTS_SET_MOD_URL = "https://www.googleapis.com/youtube/v3/comments/setModerationStatus"
_YT_COMMENTS_MARK_SPAM_URL = "https://www.googleapis.com/youtube/v3/comments/markAsSpam"
_YT_PLAYLISTS_URL = "https://www.googleapis.com/youtube/v3/playlists"
_YT_PLAYLIST_ITEMS_URL = "https://www.googleapis.com/youtube/v3/playlistItems"
_YT_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"


# ---------------------------------------------------------------------------
# Shared helpers
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


def _raise_for_yt_status(response: httpx.Response, context: str) -> None:
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
            detail=f"Kaynak bulunamadi ({context}): {message}",
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
# 1) Comment moderation
# ---------------------------------------------------------------------------


class CommentModerationRequest(BaseModel):
    external_comment_ids: List[str] = Field(
        ..., min_length=1, description="YouTube yorum ID listesi (en az 1)"
    )
    moderation_status: Literal["heldForReview", "published", "rejected"]
    ban_author: bool = Field(
        False,
        description=(
            "Yalniz 'rejected' durumunda gecerli. True ise yorum sahibi kanalda "
            "otomatik olarak engellenir."
        ),
    )


class CommentModerationResponse(BaseModel):
    status: str
    moderated_count: int
    moderation_status: str
    message: str


class CommentSpamRequest(BaseModel):
    external_comment_ids: List[str] = Field(..., min_length=1)


class CommentSpamResponse(BaseModel):
    status: str
    marked_count: int
    message: str


@router.post(
    "/comments/moderation",
    response_model=CommentModerationResponse,
)
async def set_comment_moderation(
    body: CommentModerationRequest,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark one or more comments as heldForReview / published / rejected.

    YouTube's comments.setModerationStatus accepts a comma-separated id list;
    we pass it as-is and audit the action.
    """
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    ids_csv = ",".join(body.external_comment_ids)
    params = {
        "id": ids_csv,
        "moderationStatus": body.moderation_status,
    }
    if body.moderation_status == "rejected" and body.ban_author:
        params["banAuthor"] = "true"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _YT_COMMENTS_SET_MOD_URL,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(resp, context="comment moderation")

    await write_audit_log(
        db,
        action="youtube.comment.moderation",
        entity_type="youtube_comment",
        entity_id=ids_csv[:255],
        details={
            "connection_id": conn.id,
            "moderation_status": body.moderation_status,
            "ban_author": body.ban_author,
            "count": len(body.external_comment_ids),
        },
    )
    logger.info(
        "YouTube yorum moderasyon: ids=%s status=%s connection=%s",
        ids_csv[:80], body.moderation_status, conn.id,
    )
    return CommentModerationResponse(
        status="ok",
        moderated_count=len(body.external_comment_ids),
        moderation_status=body.moderation_status,
        message="Yorum moderasyon durumu guncellendi.",
    )


@router.post("/comments/spam", response_model=CommentSpamResponse)
async def mark_comments_as_spam(
    body: CommentSpamRequest,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """Mark comments as spam (comments.markAsSpam)."""
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    ids_csv = ",".join(body.external_comment_ids)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _YT_COMMENTS_MARK_SPAM_URL,
            params={"id": ids_csv},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(resp, context="comment spam mark")

    await write_audit_log(
        db,
        action="youtube.comment.mark_spam",
        entity_type="youtube_comment",
        entity_id=ids_csv[:255],
        details={"connection_id": conn.id, "count": len(body.external_comment_ids)},
    )
    return CommentSpamResponse(
        status="ok",
        marked_count=len(body.external_comment_ids),
        message="Yorumlar spam olarak isaretlendi.",
    )


# ---------------------------------------------------------------------------
# 2) Playlist advanced
# ---------------------------------------------------------------------------


class PlaylistUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=5000)
    privacy_status: Optional[Literal["public", "unlisted", "private"]] = None


class PlaylistUpdateResponse(BaseModel):
    status: str
    external_playlist_id: str
    updated_fields: List[str]
    message: str


class PlaylistDeleteResponse(BaseModel):
    status: str
    external_playlist_id: str
    message: str


class PlaylistItemReorderRequest(BaseModel):
    external_playlist_id: str = Field(..., min_length=1)
    external_video_id: str = Field(..., min_length=1)
    position: int = Field(..., ge=0)


class PlaylistItemReorderResponse(BaseModel):
    status: str
    external_item_id: str
    position: int
    message: str


@router.put(
    "/playlists/{external_playlist_id}",
    response_model=PlaylistUpdateResponse,
)
async def update_playlist(
    external_playlist_id: str,
    body: PlaylistUpdateRequest,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a playlist's title/description/privacy.

    Reads the current snippet first so partial updates don't overwrite
    the other fields.
    """
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    # Read current
    async with httpx.AsyncClient(timeout=30.0) as client:
        get_resp = await client.get(
            _YT_PLAYLISTS_URL,
            params={"part": "snippet,status", "id": external_playlist_id},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(get_resp, context="playlist read")
    items = get_resp.json().get("items", [])
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Playlist bulunamadi: {external_playlist_id}",
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
    if body.privacy_status is not None:
        status_block["privacyStatus"] = body.privacy_status
        updated_fields.append("privacy_status")

    if not updated_fields:
        return PlaylistUpdateResponse(
            status="noop",
            external_playlist_id=external_playlist_id,
            updated_fields=[],
            message="Guncellenecek alan yok.",
        )

    # Required fields for snippet
    if "title" not in snippet:
        snippet["title"] = current.get("snippet", {}).get("title", "Untitled")

    resource = {
        "id": external_playlist_id,
        "snippet": snippet,
        "status": status_block,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        put_resp = await client.put(
            _YT_PLAYLISTS_URL,
            params={"part": "snippet,status"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            content=json.dumps(resource, ensure_ascii=False).encode(),
        )
    _raise_for_yt_status(put_resp, context="playlist update")

    await write_audit_log(
        db,
        action="youtube.playlist.update",
        entity_type="youtube_playlist",
        entity_id=external_playlist_id,
        details={"connection_id": conn.id, "fields": updated_fields},
    )
    return PlaylistUpdateResponse(
        status="ok",
        external_playlist_id=external_playlist_id,
        updated_fields=updated_fields,
        message="Playlist guncellendi.",
    )


@router.delete(
    "/playlists/{external_playlist_id}",
    response_model=PlaylistDeleteResponse,
)
async def delete_playlist(
    external_playlist_id: str,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """Delete a playlist on YouTube (playlists.delete)."""
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.delete(
            _YT_PLAYLISTS_URL,
            params={"id": external_playlist_id},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(resp, context="playlist delete")

    await write_audit_log(
        db,
        action="youtube.playlist.delete",
        entity_type="youtube_playlist",
        entity_id=external_playlist_id,
        details={"connection_id": conn.id},
    )
    return PlaylistDeleteResponse(
        status="ok",
        external_playlist_id=external_playlist_id,
        message="Playlist silindi.",
    )


@router.post(
    "/playlist-items/position",
    response_model=PlaylistItemReorderResponse,
)
async def reorder_playlist_item(
    body: PlaylistItemReorderRequest,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """
    Change the position of a video within a playlist.

    YouTube's playlistItems.update requires:
      - the playlistItem id (resource id)
      - snippet.playlistId, snippet.resourceId.videoId, snippet.position

    We look up the playlistItem id by (playlistId, videoId) via
    playlistItems.list, then issue the update.
    """
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    # Find the playlistItem id
    async with httpx.AsyncClient(timeout=30.0) as client:
        list_resp = await client.get(
            _YT_PLAYLIST_ITEMS_URL,
            params={
                "part": "snippet",
                "playlistId": body.external_playlist_id,
                "videoId": body.external_video_id,
                "maxResults": 50,
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(list_resp, context="playlist item lookup")
    items = list_resp.json().get("items", [])
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Playlist '{body.external_playlist_id}' icinde video "
                f"'{body.external_video_id}' bulunamadi."
            ),
        )
    external_item_id = items[0].get("id", "")

    resource = {
        "id": external_item_id,
        "snippet": {
            "playlistId": body.external_playlist_id,
            "resourceId": {
                "kind": "youtube#video",
                "videoId": body.external_video_id,
            },
            "position": body.position,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        upd_resp = await client.put(
            _YT_PLAYLIST_ITEMS_URL,
            params={"part": "snippet"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            content=json.dumps(resource, ensure_ascii=False).encode(),
        )
    _raise_for_yt_status(upd_resp, context="playlist item reorder")

    await write_audit_log(
        db,
        action="youtube.playlist_item.reorder",
        entity_type="youtube_playlist_item",
        entity_id=external_item_id,
        details={
            "connection_id": conn.id,
            "playlist_id": body.external_playlist_id,
            "video_id": body.external_video_id,
            "position": body.position,
        },
    )
    return PlaylistItemReorderResponse(
        status="ok",
        external_item_id=external_item_id,
        position=body.position,
        message="Playlist item pozisyonu guncellendi.",
    )


# ---------------------------------------------------------------------------
# 3) Channel branding
# ---------------------------------------------------------------------------


class ChannelBrandingRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    keywords: Optional[str] = Field(None, max_length=500)
    featured_channels: Optional[List[str]] = Field(
        None,
        description="YouTube kanal ID'leri — brandingSettings.channel.featuredChannelsUrls",
    )
    unsubscribed_trailer_video_id: Optional[str] = Field(
        None,
        description=(
            "Henuz abone olmamis ziyaretcilere gosterilecek tanitim videosunun "
            "YouTube video ID'si"
        ),
    )


class ChannelBrandingResponse(BaseModel):
    status: str
    channel_id: str
    updated_fields: List[str]
    message: str


@router.put(
    "/channel/branding",
    response_model=ChannelBrandingResponse,
)
async def update_channel_branding(
    body: ChannelBrandingRequest,
    connection_id: str = Query(..., description="YouTube PlatformConnection.id"),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the authenticated user's own channel branding settings.

    YouTube channels.update with part=brandingSettings accepts title,
    description, keywords, featuredChannelsUrls and unsubscribedTrailer.
    The channel id is resolved from the current access token via
    channels.list?mine=true so users cannot accidentally modify somebody
    else's channel.
    """
    conn = await _load_connection(db, connection_id)
    access_token = await _get_access_token(db, conn)

    # Resolve channel id + current branding
    async with httpx.AsyncClient(timeout=30.0) as client:
        get_resp = await client.get(
            _YT_CHANNELS_URL,
            params={"part": "brandingSettings", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    _raise_for_yt_status(get_resp, context="channel branding read")
    items = get_resp.json().get("items", [])
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baglantili YouTube kanali bulunamadi.",
        )
    channel = items[0]
    channel_id = channel.get("id", "")
    branding = dict(channel.get("brandingSettings") or {})
    ch_block = dict(branding.get("channel") or {})

    updated_fields: List[str] = []
    if body.title is not None:
        ch_block["title"] = body.title
        updated_fields.append("title")
    if body.description is not None:
        ch_block["description"] = body.description
        updated_fields.append("description")
    if body.keywords is not None:
        ch_block["keywords"] = body.keywords
        updated_fields.append("keywords")
    if body.featured_channels is not None:
        ch_block["featuredChannelsUrls"] = list(body.featured_channels)
        updated_fields.append("featured_channels")
    if body.unsubscribed_trailer_video_id is not None:
        ch_block["unsubscribedTrailer"] = body.unsubscribed_trailer_video_id
        updated_fields.append("unsubscribed_trailer")

    if not updated_fields:
        return ChannelBrandingResponse(
            status="noop",
            channel_id=channel_id,
            updated_fields=[],
            message="Guncellenecek alan yok.",
        )

    branding["channel"] = ch_block
    resource = {"id": channel_id, "brandingSettings": branding}

    async with httpx.AsyncClient(timeout=30.0) as client:
        put_resp = await client.put(
            _YT_CHANNELS_URL,
            params={"part": "brandingSettings"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            content=json.dumps(resource, ensure_ascii=False).encode(),
        )
    _raise_for_yt_status(put_resp, context="channel branding update")

    await write_audit_log(
        db,
        action="youtube.channel.branding_update",
        entity_type="youtube_channel",
        entity_id=channel_id,
        details={"connection_id": conn.id, "fields": updated_fields},
    )
    return ChannelBrandingResponse(
        status="ok",
        channel_id=channel_id,
        updated_fields=updated_fields,
        message="Kanal marka ayarlari guncellendi.",
    )
