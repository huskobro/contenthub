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
from app.audit.service import write_audit_log
from app.publish.youtube.token_store import YouTubeTokenStore
from app.publish.youtube.errors import YouTubeAuthError
from app.settings.credential_resolver import resolve_credential, expand_youtube_client_id

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
    scope_ok: bool = True
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
    # DB'de kısa form saklanır; Google OAuth tam format gerektirir
    resolved_client_id = expand_youtube_client_id(resolved_client_id)

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
    # DB'de kısa form saklanır; Google OAuth tam format gerektirir
    resolved_client_id = expand_youtube_client_id(resolved_client_id)

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

    await write_audit_log(db, action="youtube.auth_callback", entity_type="youtube_oauth")

    # Scope kontrolü — Google eski/yetersiz scope döndüyse uyar
    if not _token_store.has_required_scope():
        granted = token_data.get("scope", "")
        logger.warning(
            "YouTube OAuth scope yetersiz. İstenen: %s — Alınan: %s",
            "https://www.googleapis.com/auth/youtube",
            granted,
        )
        return AuthCallbackResponse(
            status="scope_warning",
            message=(
                "YouTube bağlantısı kuruldu ancak yetersiz izin alındı. "
                "Google hesap ayarlarınızdan (myaccount.google.com/permissions) "
                "bu uygulamanın eski erişimini kaldırıp tekrar bağlanın."
            ),
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
    scope_ok = _token_store.has_required_scope() if has_creds else True
    if has_creds and not scope_ok:
        message = (
            "YouTube OAuth2 token mevcut ancak yetersiz scope ile alınmış. "
            "Lütfen bağlantıyı kesip yeniden bağlanın."
        )
    elif has_creds:
        message = "YouTube OAuth2 credential mevcut. Publish işlemi yapılabilir."
    else:
        message = (
            "YouTube OAuth2 credential bulunamadı. "
            "Admin panelinden /publish/youtube/auth-url akışını tamamlayın."
        )
    return TokenStatusResponse(has_credentials=has_creds, scope_ok=scope_ok, message=message)


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
        if resp.status_code == 403:
            scope_hint = ""
            if not _token_store.has_required_scope():
                scope_hint = (
                    " Mevcut token yetersiz scope ile alınmış."
                    " Lütfen bağlantıyı kesip yeniden bağlanın."
                )
            return ChannelInfoResponse(
                connected=True,
                message=f"YouTube API hatası: HTTP 403 — Erişim reddedildi.{scope_hint}",
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
# Channel All Videos — kanalın tüm videoları
# ---------------------------------------------------------------------------

class ChannelVideoItem(BaseModel):
    video_id: str
    title: str
    thumbnail_url: Optional[str] = None
    published_at: Optional[str] = None
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    duration: Optional[str] = None
    is_contenthub: bool = False  # ContentHub üzerinden yayınlanan


class ChannelVideosResponse(BaseModel):
    videos: List[ChannelVideoItem]
    total_count: int
    contenthub_count: int
    fetched_count: int


@router.get("/channel-videos", response_model=ChannelVideosResponse)
async def get_channel_videos(
    max_results: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    Bağlı YouTube kanalının tüm videolarını döndürür (max 50).

    YouTube Data API v3 akışı:
      1. channels?mine=true → uploads playlist ID
      2. playlistItems?playlistId=uploads → video ID listesi
      3. videos?id=...  → istatistik + snippet

    ContentHub üzerinden yayınlanan videolar is_contenthub=True ile işaretlenir.
    """
    if not _token_store.has_credentials():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="YouTube kimlik bilgileri bulunamadı.",
        )
    if not _token_store.has_required_scope():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yetersiz OAuth scope. Bağlantıyı kesip yeniden bağlanın.",
        )

    try:
        access_token = await _token_store.get_access_token()
    except YouTubeAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    import httpx
    from app.db.models import PublishRecord

    # ContentHub yayın listesi — badge için
    ch_stmt = (
        select(PublishRecord.platform_video_id)
        .where(
            PublishRecord.platform == "youtube",
            PublishRecord.status == "published",
            PublishRecord.platform_video_id.isnot(None),
            PublishRecord.platform_video_id != "",
        )
    )
    ch_result = await db.execute(ch_stmt)
    contenthub_ids: set[str] = {row[0] for row in ch_result.fetchall()}

    headers = {"Authorization": f"Bearer {access_token}"}
    max_results = min(max(1, max_results), 50)

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Step 1: uploads playlist ID
        ch_resp = await client.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "contentDetails", "mine": "true"},
            headers=headers,
        )
        if ch_resp.status_code != 200:
            scope_hint = " Yetersiz scope olabilir — bağlantıyı kesip yeniden bağlanın." if ch_resp.status_code == 403 else ""
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Kanal bilgisi alınamadı: HTTP {ch_resp.status_code}.{scope_hint}",
            )
        ch_data = ch_resp.json()
        ch_items = ch_data.get("items", [])
        if not ch_items:
            return ChannelVideosResponse(videos=[], total_count=0, contenthub_count=0, fetched_count=0)

        uploads_playlist_id = (
            ch_items[0]
            .get("contentDetails", {})
            .get("relatedPlaylists", {})
            .get("uploads", "")
        )
        if not uploads_playlist_id:
            return ChannelVideosResponse(videos=[], total_count=0, contenthub_count=0, fetched_count=0)

        # Step 2: playlist items → video IDs
        pl_resp = await client.get(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            params={
                "part": "contentDetails",
                "playlistId": uploads_playlist_id,
                "maxResults": max_results,
            },
            headers=headers,
        )
        if pl_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Playlist verisi alınamadı: HTTP {pl_resp.status_code}",
            )
        pl_data = pl_resp.json()
        pl_items = pl_data.get("items", [])
        video_ids = [
            item["contentDetails"]["videoId"]
            for item in pl_items
            if item.get("contentDetails", {}).get("videoId")
        ]
        if not video_ids:
            return ChannelVideosResponse(videos=[], total_count=0, contenthub_count=0, fetched_count=0)

        # Step 3: video details (statistics + snippet + contentDetails for duration)
        vid_resp = await client.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "statistics,snippet,contentDetails",
                "id": ",".join(video_ids),
            },
            headers=headers,
        )
        if vid_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Video detayları alınamadı: HTTP {vid_resp.status_code}",
            )
        vid_data = vid_resp.json()

    videos: List[ChannelVideoItem] = []
    for item in vid_data.get("items", []):
        vid_id = item.get("id", "")
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        content_details = item.get("contentDetails", {})

        # En iyi thumbnail: maxres → high → medium → default
        thumbs = snippet.get("thumbnails", {})
        thumb_url = (
            thumbs.get("maxres", {}).get("url")
            or thumbs.get("high", {}).get("url")
            or thumbs.get("medium", {}).get("url")
            or thumbs.get("default", {}).get("url")
        )

        videos.append(
            ChannelVideoItem(
                video_id=vid_id,
                title=snippet.get("title", ""),
                thumbnail_url=thumb_url,
                published_at=snippet.get("publishedAt"),
                view_count=int(stats.get("viewCount", 0)),
                like_count=int(stats.get("likeCount", 0)),
                comment_count=int(stats.get("commentCount", 0)),
                duration=content_details.get("duration"),
                is_contenthub=vid_id in contenthub_ids,
            )
        )

    contenthub_count = sum(1 for v in videos if v.is_contenthub)

    return ChannelVideosResponse(
        videos=videos,
        total_count=len(videos),
        contenthub_count=contenthub_count,
        fetched_count=len(videos),
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
            scope_hint = ""
            if resp.status_code == 403 and not _token_store.has_required_scope():
                scope_hint = " Mevcut token yetersiz scope ile alinmis. Baglantiyi kesip yeniden baglanin."
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"YouTube API hatasi: HTTP {resp.status_code}.{scope_hint}",
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
async def revoke_credentials(db: AsyncSession = Depends(get_db)):
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
    await write_audit_log(db, action="youtube.revoke", entity_type="youtube_oauth")
    # Dosya yoksa sessizce başarılı döner (idempotent)
