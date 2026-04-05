"""
YouTube OAuth2 Router — M7-C2.

Admin panelden YouTube yetkilendirmesi ve token yönetimi.

Endpoint'ler:
  GET  /publish/youtube/auth-url      : OAuth2 yetkilendirme URL'i üretir
  POST /publish/youtube/auth-callback : Authorization code'u token ile takas eder
  GET  /publish/youtube/status        : Token durumu (var mı / süresi dolmuş mu)
  GET  /publish/youtube/video-stats   : Yayınlanan videoların YouTube istatistikleri
  DELETE /publish/youtube/revoke      : Token dosyasını siler

Güvenlik notu:
  Bu endpoint'ler hassas OAuth2 akışını yönetir.
  Gerçek deployment'ta admin-only erişim zorunludur.
  MVP'de bu zorlama henüz uygulanmamıştır — bu bilinen kısıtlamadır.

Yetkilendirme akışı:
  1. GET /auth-url → redirect URL döner
  2. Kullanıcı browser'da Google onayı verir
  3. Google redirect_uri'ye code parametresiyle döner
  4. POST /auth-callback body'de code gönderilir
  5. Token dosyası oluşturulur
  6. Bundan sonra upload/activate zinciri çalışabilir
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.publish.youtube.token_store import YouTubeTokenStore
from app.publish.youtube.errors import YouTubeAuthError
from app.settings.credential_resolver import resolve_credential

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/publish/youtube", tags=["publish-youtube"])

_token_store = YouTubeTokenStore()


# ---------------------------------------------------------------------------
# Request / Response şemaları (bu router'a özel, küçük, local)
# ---------------------------------------------------------------------------

class AuthUrlResponse(BaseModel):
    auth_url: str


class AuthCallbackRequest(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    code: str
    redirect_uri: str


class AuthCallbackResponse(BaseModel):
    status: str
    message: str


class TokenStatusResponse(BaseModel):
    has_credentials: bool
    message: str


# ---------------------------------------------------------------------------
# Endpoint'ler
# ---------------------------------------------------------------------------

@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_auth_url(
    redirect_uri: str,
    client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Google OAuth2 yetkilendirme URL'i döndürür.

    client_id query param olarak verilebilir (geriye uyumluluk).
    Verilmezse credential resolver uzerinden DB -> .env'den okunur.
    """
    resolved_client_id = client_id
    if not resolved_client_id:
        resolved_client_id = await resolve_credential("credential.youtube_client_id", db)
    if not resolved_client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube client_id bulunamadi. Query param olarak girin veya credential ayarlarindan kaydedin.",
        )

    try:
        auth_url = _token_store.get_auth_url(
            client_id=resolved_client_id,
            redirect_uri=redirect_uri,
        )
    except Exception as exc:
        logger.error("auth-url üretme hatası: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auth URL üretme hatası: {exc}",
        )
    return AuthUrlResponse(auth_url=auth_url)


@router.post("/auth-callback", response_model=AuthCallbackResponse)
async def auth_callback(
    body: AuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authorization code'u access + refresh token ile takas eder ve kaydeder.

    Bu endpoint Google'ın redirect_uri'sine yönlendirmesinden sonra
    admin panel tarafından çağrılır.

    Body:
        client_id     : Google API Console client ID (opsiyonel — DB'den okunabilir)
        client_secret : Google API Console client secret (opsiyonel — DB'den okunabilir)
        code          : OAuth2 authorization code
        redirect_uri  : /auth-url'de kullanılan aynı redirect URI
    """
    # Credential resolver ile client_id/secret cozumle (body -> DB -> .env)
    resolved_client_id = body.client_id
    if not resolved_client_id:
        resolved_client_id = await resolve_credential("credential.youtube_client_id", db)
    if not resolved_client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube client_id bulunamadi.",
        )

    resolved_client_secret = body.client_secret
    if not resolved_client_secret:
        resolved_client_secret = await resolve_credential("credential.youtube_client_secret", db)
    if not resolved_client_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube client_secret bulunamadi.",
        )

    try:
        token_data = await _token_store.exchange_code_for_tokens(
            client_id=resolved_client_id,
            client_secret=resolved_client_secret,
            code=body.code,
            redirect_uri=body.redirect_uri,
        )
        _token_store.save_from_auth_response(
            client_id=resolved_client_id,
            client_secret=resolved_client_secret,
            auth_response=token_data,
        )
    except YouTubeAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("auth-callback hatası: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token exchange hatası: {exc}",
        )

    return AuthCallbackResponse(
        status="ok",
        message="YouTube OAuth2 yetkilendirmesi başarıyla tamamlandı.",
    )


@router.get("/status", response_model=TokenStatusResponse)
async def token_status():
    """
    YouTube token durumunu döndürür.

    has_credentials=True : refresh_token + client_id mevcutsa.
    Erişim tokenının süresi dolmuş olabilir — get_access_token() çağrısında yenilenir.
    """
    has_creds = _token_store.has_credentials()
    if has_creds:
        message = "YouTube OAuth2 credential mevcut. Publish işlemi yapılabilir."
    else:
        message = (
            "YouTube OAuth2 credential bulunamadı. "
            "Admin panelinden /publish/youtube/auth-url akışını tamamlayın."
        )
    return TokenStatusResponse(has_credentials=has_creds, message=message)


class ChannelInfoResponse(BaseModel):
    connected: bool
    channel_id: Optional[str] = None
    channel_title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    subscriber_count: Optional[str] = None
    video_count: Optional[str] = None
    message: str = ""


@router.get("/channel-info", response_model=ChannelInfoResponse)
async def get_channel_info():
    """
    Bağlı YouTube kanalının temel bilgilerini döndürür.

    OAuth token yoksa connected=False döner.
    Token varsa YouTube Data API'den kanal bilgisi çeker.
    """
    if not _token_store.has_credentials():
        return ChannelInfoResponse(
            connected=False,
            message="YouTube OAuth2 credential bulunamadı.",
        )

    try:
        access_token = await _token_store.get_access_token()
    except YouTubeAuthError as exc:
        return ChannelInfoResponse(
            connected=False,
            message=f"Token alınamadı: {exc}",
        )

    import httpx
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={
                    "part": "snippet,statistics",
                    "mine": "true",
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if resp.status_code != 200:
            return ChannelInfoResponse(
                connected=True,
                message=f"YouTube API hatası: HTTP {resp.status_code}",
            )
        data = resp.json()
        items = data.get("items", [])
        if not items:
            return ChannelInfoResponse(
                connected=True,
                message="Bağlı kanal bulunamadı.",
            )
        ch = items[0]
        snippet = ch.get("snippet", {})
        stats = ch.get("statistics", {})
        return ChannelInfoResponse(
            connected=True,
            channel_id=ch.get("id"),
            channel_title=snippet.get("title"),
            thumbnail_url=snippet.get("thumbnails", {}).get("default", {}).get("url"),
            subscriber_count=stats.get("subscriberCount"),
            video_count=stats.get("videoCount"),
            message="Kanal bilgisi başarıyla alındı.",
        )
    except Exception as exc:
        logger.error("YouTube channel-info hatası: %s", exc)
        return ChannelInfoResponse(
            connected=True,
            message=f"Kanal bilgisi alınamadı: {exc}",
        )


# ---------------------------------------------------------------------------
# Video Stats şemaları
# ---------------------------------------------------------------------------

class VideoStatsItem(BaseModel):
    video_id: str
    title: str
    published_at: Optional[str] = None
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0


class VideoStatsResponse(BaseModel):
    videos: List[VideoStatsItem]
    total_views: int
    total_likes: int
    total_comments: int
    video_count: int


@router.get("/video-stats", response_model=VideoStatsResponse)
async def get_video_stats(db: AsyncSession = Depends(get_db)):
    """
    ContentHub uzerinden yayinlanan videolarin YouTube istatistiklerini dondurur.

    PublishRecord tablosundan platform='youtube' ve status='published' kayitlarini
    bulur, her birinin platform_video_id'si icin YouTube Data API v3'ten
    istatistik ceker.

    youtube.upload scope'u ile videos.list endpoint'i calisiyor.
    """
    if not _token_store.has_credentials():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="YouTube kimlik bilgileri bulunamadi. Ayarlar > YouTube baglantisindan yetkilendirme yapin.",
        )

    try:
        access_token = await _token_store.get_access_token()
    except YouTubeAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"YouTube token alinamadi: {exc}",
        )

    # DB'den yayinlanmis videolarin platform_video_id'lerini cek
    from app.db.models import PublishRecord

    stmt = (
        select(PublishRecord.platform_video_id)
        .where(
            PublishRecord.platform == "youtube",
            PublishRecord.status == "published",
            PublishRecord.platform_video_id.isnot(None),
            PublishRecord.platform_video_id != "",
        )
        .order_by(PublishRecord.published_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    video_ids = [row[0] for row in result.fetchall()]

    if not video_ids:
        return VideoStatsResponse(
            videos=[],
            total_views=0,
            total_likes=0,
            total_comments=0,
            video_count=0,
        )

    # YouTube Data API v3 — videos.list (batch, max 50)
    import httpx

    ids_param = ",".join(video_ids)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "part": "statistics,snippet",
                    "id": ids_param,
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if resp.status_code != 200:
            logger.error("YouTube video-stats API hatasi: HTTP %s — %s", resp.status_code, resp.text[:300])
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"YouTube API hatasi: HTTP {resp.status_code}",
            )

        data = resp.json()
        items = data.get("items", [])

        videos: List[VideoStatsItem] = []
        total_views = 0
        total_likes = 0
        total_comments = 0

        for item in items:
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            views = int(stats.get("viewCount", 0))
            likes = int(stats.get("likeCount", 0))
            comments = int(stats.get("commentCount", 0))
            total_views += views
            total_likes += likes
            total_comments += comments
            videos.append(
                VideoStatsItem(
                    video_id=item.get("id", ""),
                    title=snippet.get("title", ""),
                    published_at=snippet.get("publishedAt"),
                    view_count=views,
                    like_count=likes,
                    comment_count=comments,
                )
            )

        # Record snapshots for time-series tracking (M14-C)
        try:
            from app.db.models import VideoStatsSnapshot

            for v in videos:
                db.add(VideoStatsSnapshot(
                    platform_video_id=v.video_id,
                    view_count=v.view_count,
                    like_count=v.like_count,
                    comment_count=v.comment_count,
                ))
            await db.commit()
        except Exception as snap_exc:
            logger.warning("Snapshot kaydi basarisiz (non-fatal): %s", snap_exc)
            await db.rollback()

        return VideoStatsResponse(
            videos=videos,
            total_views=total_views,
            total_likes=total_likes,
            total_comments=total_comments,
            video_count=len(videos),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("YouTube video-stats beklenmeyen hata: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"YouTube API hatasi: {exc}",
        )


# ---------------------------------------------------------------------------
# Video Stats Trend (M14-C)
# ---------------------------------------------------------------------------

class VideoStatsTrendItem(BaseModel):
    snapshot_at: str
    view_count: int
    like_count: int
    comment_count: int


class VideoStatsTrendResponse(BaseModel):
    video_id: str
    title: str
    snapshots: list[VideoStatsTrendItem]


@router.get("/video-stats/{video_id}/trend", response_model=VideoStatsTrendResponse)
async def get_video_stats_trend(video_id: str, db: AsyncSession = Depends(get_db)):
    """
    Belirli bir videonun zaman serisi istatistiklerini dondurur.

    Local snapshot verisi kullanir — YouTube Analytics API scope gerektirmez.
    """
    import json
    from app.db.models import VideoStatsSnapshot, PublishRecord

    # Video title from publish record
    stmt = select(PublishRecord.payload_json).where(
        PublishRecord.platform_video_id == video_id,
        PublishRecord.platform == "youtube",
    ).limit(1)
    result = await db.execute(stmt)
    row = result.first()
    title = "Bilinmeyen Video"
    if row and row[0]:
        try:
            payload = json.loads(row[0]) if isinstance(row[0], str) else row[0]
            title = payload.get("title", title)
        except (json.JSONDecodeError, TypeError):
            pass

    # Fetch snapshots ordered by time
    snap_stmt = (
        select(VideoStatsSnapshot)
        .where(VideoStatsSnapshot.platform_video_id == video_id)
        .order_by(VideoStatsSnapshot.snapshot_at.asc())
    )
    snap_result = await db.execute(snap_stmt)
    snapshots = snap_result.scalars().all()

    trend_items = [
        VideoStatsTrendItem(
            snapshot_at=s.snapshot_at.isoformat() if s.snapshot_at else "",
            view_count=s.view_count,
            like_count=s.like_count,
            comment_count=s.comment_count,
        )
        for s in snapshots
    ]

    return VideoStatsTrendResponse(
        video_id=video_id,
        title=title,
        snapshots=trend_items,
    )


@router.delete("/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_credentials():
    """
    YouTube token dosyasını siler.

    Yeniden yetkilendirme gerektiğinde kullanılır.
    Bu işlem geri alınamaz — mevcut access/refresh token silinir.
    """
    from pathlib import Path
    from app.core.config import settings

    token_path = settings.data_dir / "youtube_tokens.json"
    if token_path.exists():
        token_path.unlink()
        logger.info("YouTube token dosyası silindi: %s", token_path)
    # Dosya yoksa sessizce başarılı döner (idempotent)
