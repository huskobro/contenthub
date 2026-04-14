"""
YouTube OAuth2 Router — M7-C2 / Per-Connection DB Store.

Admin panelden YouTube yetkilendirmesi ve token yönetimi.
Per-channel-profile token storage: her ChannelProfile icin ayri PlatformConnection + PlatformCredential.

Endpoint'ler:
  GET  /publish/youtube/auth-url      : OAuth2 yetkilendirme URL'i üretir (channel_profile_id zorunlu)
  POST /publish/youtube/auth-callback : Authorization code'u token ile takas eder
  GET  /publish/youtube/status        : Token durumu (connection_id veya channel_profile_id ile)
  GET  /publish/youtube/channel-info  : Bagli kanala ait bilgi
  GET  /publish/youtube/channel-videos: Kanal videolari
  GET  /publish/youtube/video-stats   : ContentHub videolarinin YouTube istatistikleri
  DELETE /publish/youtube/revoke      : Baglanti kimlik bilgilerini siler
"""

from __future__ import annotations

import logging
from typing import List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.audit.service import write_audit_log
from app.core.crypto import get_token_cipher
from app.db.models import PlatformConnection, PlatformCredential, ChannelProfile
from app.publish.youtube.token_store import DBYouTubeTokenStore, YOUTUBE_SCOPE
from app.publish.youtube.errors import YouTubeAuthError
from app.settings.credential_resolver import resolve_credential, expand_youtube_client_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/publish/youtube", tags=["publish-youtube"])

_token_store = DBYouTubeTokenStore()


# ---------------------------------------------------------------------------
# Request / Response şemaları
# ---------------------------------------------------------------------------


class ChannelCredentialsRequest(BaseModel):
    client_id: str
    client_secret: str


class ChannelCredentialsResponse(BaseModel):
    channel_profile_id: str
    has_credentials: bool
    masked_client_id: Optional[str] = None
    message: str = ""


class AuthUrlResponse(BaseModel):
    auth_url: str


class AuthCallbackRequest(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    code: str
    redirect_uri: str
    channel_profile_id: Optional[str] = None


class AuthCallbackResponse(BaseModel):
    status: str
    message: str
    connection_id: Optional[str] = None


class TokenStatusResponse(BaseModel):
    has_credentials: bool
    scope_ok: bool = True
    message: str
    connection_id: Optional[str] = None


class ChannelInfoResponse(BaseModel):
    connected: bool
    channel_id: Optional[str] = None
    channel_title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    subscriber_count: Optional[str] = None
    video_count: Optional[str] = None
    message: str = ""
    connection_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper: resolve PlatformConnection
# ---------------------------------------------------------------------------


async def _resolve_connection(
    db: AsyncSession,
    connection_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
) -> Optional[PlatformConnection]:
    """
    Resolve a YouTube PlatformConnection.

    Priority: connection_id > channel_profile_id > first available.
    """
    if connection_id:
        conn = await db.get(PlatformConnection, connection_id)
        if conn and conn.platform == "youtube":
            return conn
        return None

    q = select(PlatformConnection).where(
        PlatformConnection.platform == "youtube",
        PlatformConnection.connection_status != "archived",
    )
    if channel_profile_id:
        q = q.where(PlatformConnection.channel_profile_id == channel_profile_id)
    q = q.order_by(
        PlatformConnection.is_primary.desc(),
        PlatformConnection.created_at.desc(),
    ).limit(1)
    result = await db.execute(q)
    return result.scalars().first()


async def _find_or_create_connection(
    db: AsyncSession,
    channel_profile_id: str,
) -> PlatformConnection:
    """Find existing YouTube connection for channel_profile_id, or create a new one."""
    existing = await _resolve_connection(db, channel_profile_id=channel_profile_id)
    if existing:
        return existing

    conn = PlatformConnection(
        channel_profile_id=channel_profile_id,
        platform="youtube",
        auth_state="pending",
        token_state="invalid",
        connection_status="disconnected",
        scope_status="insufficient",
        is_primary=True,
    )
    db.add(conn)
    await db.flush()
    return conn


async def _fetch_youtube_channel_info(access_token: str) -> Optional[dict]:
    """Fetch YouTube channel info using access token. Returns dict with channel fields or None."""
    import httpx

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={"part": "snippet,statistics", "mine": "true"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if resp.status_code != 200:
            logger.warning("YouTube channel info API hatasi: HTTP %s", resp.status_code)
            return None
        data = resp.json()
        items = data.get("items", [])
        if not items:
            return None
        ch = items[0]
        snippet = ch.get("snippet", {})
        stats = ch.get("statistics", {})
        return {
            "channel_id": ch.get("id"),
            "channel_title": snippet.get("title"),
            "thumbnail_url": snippet.get("thumbnails", {}).get("default", {}).get("url"),
            "subscriber_count": stats.get("subscriberCount"),
            "video_count": stats.get("videoCount"),
        }
    except Exception as exc:
        logger.warning("YouTube channel info cekme hatasi: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Per-Channel Credential Endpoints
# ---------------------------------------------------------------------------


@router.get("/channel-credentials/{channel_profile_id}", response_model=ChannelCredentialsResponse)
async def get_channel_credentials(
    channel_profile_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Belirli bir kanal profili icin YouTube API kimlik bilgileri durumunu dondurur."""
    conn = await _resolve_connection(db, channel_profile_id=channel_profile_id)
    if not conn:
        return ChannelCredentialsResponse(
            channel_profile_id=channel_profile_id,
            has_credentials=False,
            message="Bu kanal icin YouTube baglantisi bulunamadi.",
        )
    cred = await _token_store.load_credential(db, conn.id)
    if not cred or not cred.client_id:
        return ChannelCredentialsResponse(
            channel_profile_id=channel_profile_id,
            has_credentials=False,
            message="YouTube API kimlik bilgileri henuz girilmemis.",
        )
    # Mask client_id for display
    cid = cred.client_id
    masked = "\u25cf" * max(0, len(cid) - 8) + cid[-8:] if len(cid) > 8 else "\u25cf" * len(cid)
    return ChannelCredentialsResponse(
        channel_profile_id=channel_profile_id,
        has_credentials=True,
        masked_client_id=masked,
        message="YouTube API kimlik bilgileri mevcut.",
    )


@router.put("/channel-credentials/{channel_profile_id}", response_model=ChannelCredentialsResponse)
async def save_channel_credentials(
    channel_profile_id: str,
    body: ChannelCredentialsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Belirli bir kanal profili icin YouTube client_id/secret kaydeder.

    PlatformConnection + PlatformCredential yoksa olusturur.
    Sadece client_id/secret saklar — OAuth akisi ayrica gereklidir.
    """
    # Validate channel exists
    ch = await db.get(ChannelProfile, channel_profile_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")

    # Find or create connection
    conn = await _resolve_connection(db, channel_profile_id=channel_profile_id)
    if not conn:
        conn = PlatformConnection(
            channel_profile_id=channel_profile_id,
            platform="youtube",
            auth_state="pending",
            token_state="invalid",
            connection_status="disconnected",
            scope_status="insufficient",
            scopes_required=YOUTUBE_SCOPE,
            is_primary=True,
        )
        db.add(conn)
        await db.flush()

    # Normalize client_id — strip .apps.googleusercontent.com suffix for storage
    from app.settings.credential_resolver import _normalize_credential_value

    normalized_cid = _normalize_credential_value("credential.youtube_client_id", body.client_id)

    # Upsert PlatformCredential — encrypt client_secret at rest.
    _cipher = get_token_cipher()
    encrypted_secret = _cipher.encrypt(body.client_secret.strip())
    cred = await _token_store.load_credential(db, conn.id)
    if cred:
        cred.client_id = normalized_cid
        cred.client_secret = encrypted_secret
    else:
        cred = PlatformCredential(
            platform_connection_id=conn.id,
            client_id=normalized_cid,
            client_secret=encrypted_secret,
        )
        db.add(cred)

    await db.commit()

    masked = "\u25cf" * max(0, len(normalized_cid) - 8) + normalized_cid[-8:] if len(normalized_cid) > 8 else "\u25cf" * len(normalized_cid)

    await write_audit_log(
        db,
        action="youtube.save_channel_credentials",
        entity_type="platform_credential",
        entity_id=conn.id,
    )

    return ChannelCredentialsResponse(
        channel_profile_id=channel_profile_id,
        has_credentials=True,
        masked_client_id=masked,
        message="YouTube API kimlik bilgileri kaydedildi.",
    )


# ---------------------------------------------------------------------------
# Endpoint'ler
# ---------------------------------------------------------------------------


@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_auth_url(
    redirect_uri: str,
    channel_profile_id: str = Query(..., description="ChannelProfile ID — baglanti bu profile'a scope edilir"),
    client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Google OAuth2 yetkilendirme URL'i dondurur.

    channel_profile_id zorunlu: OAuth callback'te bu ID ile PlatformConnection olusturulacak.
    """
    # Validate channel_profile_id exists
    profile = await db.get(ChannelProfile, channel_profile_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ChannelProfile bulunamadi: {channel_profile_id}",
        )

    # Priority: query param > per-channel PlatformCredential > global setting
    resolved_client_id = client_id

    if not resolved_client_id:
        conn = await _resolve_connection(db, channel_profile_id=channel_profile_id)
        if conn:
            cred = await _token_store.load_credential(db, conn.id)
            if cred and cred.client_id:
                resolved_client_id = expand_youtube_client_id(cred.client_id)

    if not resolved_client_id:
        resolved_client_id = await resolve_credential("credential.youtube_client_id", db)
    if not resolved_client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube client_id bulunamadi. Kanal ayarlarindan veya genel ayarlardan girin.",
        )
    resolved_client_id = expand_youtube_client_id(resolved_client_id)

    try:
        auth_url = _token_store.get_auth_url(
            client_id=resolved_client_id,
            redirect_uri=redirect_uri,
            state=channel_profile_id,
        )
    except Exception as exc:
        logger.error("auth-url uretme hatasi: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auth URL uretme hatasi: {exc}",
        )
    return AuthUrlResponse(auth_url=auth_url)


@router.post("/auth-callback", response_model=AuthCallbackResponse)
async def auth_callback(
    body: AuthCallbackRequest,
    state: Optional[str] = Query(None, description="channel_profile_id from OAuth state param"),
    db: AsyncSession = Depends(get_db),
):
    """
    Authorization code'u access + refresh token ile takas eder ve DB'ye kaydeder.

    channel_profile_id body'den veya state query param'dan alinir.
    Basarili exchange sonrasi PlatformConnection + PlatformCredential olusturulur/guncellenir.
    """
    # Resolve channel_profile_id: body > state query param
    channel_profile_id = body.channel_profile_id or state
    if not channel_profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="channel_profile_id zorunlu. Body'de veya state query param olarak gonderin.",
        )

    # Validate channel_profile_id exists
    profile = await db.get(ChannelProfile, channel_profile_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ChannelProfile bulunamadi: {channel_profile_id}",
        )

    # Resolve client credentials
    # Priority: body param > per-channel PlatformCredential > global setting
    resolved_client_id = body.client_id
    resolved_client_secret = body.client_secret

    if not resolved_client_id or not resolved_client_secret:
        conn = await _resolve_connection(db, channel_profile_id=channel_profile_id)
        if conn:
            existing_cred = await _token_store.load_credential(db, conn.id)
            if existing_cred:
                if not resolved_client_id and existing_cred.client_id:
                    resolved_client_id = expand_youtube_client_id(existing_cred.client_id)
                if not resolved_client_secret and existing_cred.client_secret:
                    # Decrypt at-rest ciphertext (legacy plaintext passes through).
                    resolved_client_secret = get_token_cipher().decrypt(existing_cred.client_secret)

    if not resolved_client_id:
        resolved_client_id = await resolve_credential("credential.youtube_client_id", db)
    if not resolved_client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube client_id bulunamadi. Kanal ayarlarindan veya genel ayarlardan girin.",
        )
    resolved_client_id = expand_youtube_client_id(resolved_client_id)

    if not resolved_client_secret:
        resolved_client_secret = await resolve_credential("credential.youtube_client_secret", db)
    if not resolved_client_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube client_secret bulunamadi. Kanal ayarlarindan veya genel ayarlardan girin.",
        )

    # Exchange code for tokens
    try:
        token_data = await _token_store.exchange_code_for_tokens(
            client_id=resolved_client_id,
            client_secret=resolved_client_secret,
            code=body.code,
            redirect_uri=body.redirect_uri,
        )
    except YouTubeAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("auth-callback token exchange hatasi: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token exchange hatasi: {exc}",
        )

    # Find or create PlatformConnection
    connection = await _find_or_create_connection(db, channel_profile_id)

    # Save tokens to PlatformCredential
    await _token_store.save_from_auth_response(
        db=db,
        connection_id=connection.id,
        client_id=resolved_client_id,
        client_secret=resolved_client_secret,
        auth_response=token_data,
    )

    # Determine scope status — hem youtube hem yt-analytics.readonly istiyoruz
    from app.publish.youtube.token_store import (
        YOUTUBE_ANALYTICS_SCOPE,
        YOUTUBE_SCOPE_STRING,
    )
    granted_scope = token_data.get("scope", "")
    granted_set = set(granted_scope.split())
    youtube_ok = YOUTUBE_SCOPE in granted_set
    # Analytics scope opsiyonel degerlendirilir — eksikligi publish'i bloklamaz,
    # sadece capability matrix'inde can_read_analytics blocked_by_scope isaretler.
    analytics_ok = YOUTUBE_ANALYTICS_SCOPE in granted_set

    # Update PlatformConnection fields
    connection.auth_state = "authorized"
    connection.token_state = "valid"
    connection.connection_status = "connected"
    connection.scopes_granted = granted_scope
    connection.scopes_required = YOUTUBE_SCOPE_STRING
    connection.scope_status = "sufficient" if youtube_ok else "insufficient"
    connection.requires_reauth = not youtube_ok

    # Fetch channel info from YouTube and update connection
    access_token = token_data.get("access_token", "")
    ch_info = await _fetch_youtube_channel_info(access_token)
    if ch_info:
        connection.external_account_id = ch_info.get("channel_id")
        connection.external_account_name = ch_info.get("channel_title")
        connection.external_avatar_url = ch_info.get("thumbnail_url")
        sub_count = ch_info.get("subscriber_count")
        if sub_count is not None:
            try:
                connection.subscriber_count = int(sub_count)
            except (ValueError, TypeError):
                pass

    await db.commit()

    await write_audit_log(
        db,
        action="youtube.auth_callback",
        entity_type="youtube_oauth",
        entity_id=connection.id,
    )

    # Publish Core Hardening Pack — Gate 1: fix undefined scope_ok reference.
    # In this callback scope the scope-ok flag is called youtube_ok (line 449).
    if not youtube_ok:
        logger.warning(
            "YouTube OAuth scope yetersiz. Istenen: %s — Alinan: %s",
            YOUTUBE_SCOPE,
            granted_scope,
        )
        return AuthCallbackResponse(
            status="scope_warning",
            connection_id=connection.id,
            message=(
                "YouTube baglantisi kuruldu ancak yetersiz izin alindi. "
                "Google hesap ayarlarinizdan (myaccount.google.com/permissions) "
                "bu uygulamanin eski erisimini kaldirip tekrar baglanin."
            ),
        )

    return AuthCallbackResponse(
        status="ok",
        connection_id=connection.id,
        message="YouTube OAuth2 yetkilendirmesi basariyla tamamlandi.",
    )


@router.get("/status", response_model=TokenStatusResponse)
async def token_status(
    connection_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    YouTube token durumunu dondurur.

    connection_id veya channel_profile_id ile belirli baglanti sorgulanabilir.
    Hicbiri verilmezse ilk uygun baglanti kullanilir (geriye uyumluluk).
    """
    conn = await _resolve_connection(db, connection_id=connection_id, channel_profile_id=channel_profile_id)
    if not conn:
        return TokenStatusResponse(
            has_credentials=False,
            scope_ok=True,
            message=(
                "YouTube OAuth2 credential bulunamadi. "
                "Kanal ayarlarindan /publish/youtube/auth-url akisini tamamlayin."
            ),
        )

    has_creds = await _token_store.has_credentials(db, conn.id)
    scope_ok = await _token_store.has_required_scope(db, conn.id) if has_creds else True

    if has_creds and not scope_ok:
        message = (
            "YouTube OAuth2 token mevcut ancak yetersiz scope ile alinmis. "
            "Lutfen baglantiyi kesip yeniden baglanin."
        )
    elif has_creds:
        message = "YouTube OAuth2 credential mevcut. Publish islemi yapilabilir."
    else:
        message = (
            "YouTube OAuth2 credential bulunamadi. "
            "Kanal ayarlarindan /publish/youtube/auth-url akisini tamamlayin."
        )
    return TokenStatusResponse(
        has_credentials=has_creds,
        scope_ok=scope_ok,
        message=message,
        connection_id=conn.id,
    )


@router.get("/channel-info", response_model=ChannelInfoResponse)
async def get_channel_info(
    connection_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Bagli YouTube kanalinin temel bilgilerini dondurur.
    """
    conn = await _resolve_connection(db, connection_id=connection_id, channel_profile_id=channel_profile_id)
    if not conn:
        return ChannelInfoResponse(
            connected=False,
            message="YouTube OAuth2 credential bulunamadi.",
        )

    has_creds = await _token_store.has_credentials(db, conn.id)
    if not has_creds:
        return ChannelInfoResponse(
            connected=False,
            message="YouTube OAuth2 credential bulunamadi.",
            connection_id=conn.id,
        )

    try:
        access_token = await _token_store.get_access_token(db, conn.id)
    except YouTubeAuthError as exc:
        return ChannelInfoResponse(
            connected=False,
            message=f"Token alinamadi: {exc}",
            connection_id=conn.id,
        )

    ch_info = await _fetch_youtube_channel_info(access_token)
    if not ch_info:
        scope_ok = await _token_store.has_required_scope(db, conn.id)
        scope_hint = ""
        if not scope_ok:
            scope_hint = " Mevcut token yetersiz scope ile alinmis. Lutfen baglantiyi kesip yeniden baglanin."
        return ChannelInfoResponse(
            connected=True,
            message=f"Kanal bilgisi alinamadi.{scope_hint}",
            connection_id=conn.id,
        )

    return ChannelInfoResponse(
        connected=True,
        channel_id=ch_info.get("channel_id"),
        channel_title=ch_info.get("channel_title"),
        thumbnail_url=ch_info.get("thumbnail_url"),
        subscriber_count=ch_info.get("subscriber_count"),
        video_count=ch_info.get("video_count"),
        message="Kanal bilgisi basariyla alindi.",
        connection_id=conn.id,
    )


# ---------------------------------------------------------------------------
# Channel All Videos
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
    is_contenthub: bool = False


class ChannelVideosResponse(BaseModel):
    videos: List[ChannelVideoItem]
    total_count: int
    contenthub_count: int
    fetched_count: int


@router.get("/channel-videos", response_model=ChannelVideosResponse)
async def get_channel_videos(
    max_results: int = 50,
    connection_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Bagli YouTube kanalinin tum videolarini dondurur (max 50).
    """
    conn = await _resolve_connection(db, connection_id=connection_id, channel_profile_id=channel_profile_id)
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="YouTube baglantisi bulunamadi.",
        )

    has_creds = await _token_store.has_credentials(db, conn.id)
    if not has_creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="YouTube kimlik bilgileri bulunamadi.",
        )
    scope_ok = await _token_store.has_required_scope(db, conn.id)
    if not scope_ok:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yetersiz OAuth scope. Baglantiyi kesip yeniden baglanin.",
        )

    try:
        access_token = await _token_store.get_access_token(db, conn.id)
    except YouTubeAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    import httpx
    from app.db.models import PublishRecord

    # ContentHub yayin listesi — badge icin
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
    contenthub_ids: Set[str] = {row[0] for row in ch_result.fetchall()}

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
            scope_hint = " Yetersiz scope olabilir — baglantiyi kesip yeniden baglanin." if ch_resp.status_code == 403 else ""
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Kanal bilgisi alinamadi: HTTP {ch_resp.status_code}.{scope_hint}",
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

        # Step 2: playlist items -> video IDs
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
                detail=f"Playlist verisi alinamadi: HTTP {pl_resp.status_code}",
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

        # Step 3: video details
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
                detail=f"Video detaylari alinamadi: HTTP {vid_resp.status_code}",
            )
        vid_data = vid_resp.json()

    videos: List[ChannelVideoItem] = []
    for item in vid_data.get("items", []):
        vid_id = item.get("id", "")
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        content_details = item.get("contentDetails", {})

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
# Video Stats
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
async def get_video_stats(
    connection_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    ContentHub uzerinden yayinlanan videolarin YouTube istatistiklerini dondurur.
    """
    conn = await _resolve_connection(db, connection_id=connection_id, channel_profile_id=channel_profile_id)
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="YouTube baglantisi bulunamadi. Kanal ayarlarindan yetkilendirme yapin.",
        )

    has_creds = await _token_store.has_credentials(db, conn.id)
    if not has_creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="YouTube kimlik bilgileri bulunamadi. Ayarlar > YouTube baglantisindan yetkilendirme yapin.",
        )

    try:
        access_token = await _token_store.get_access_token(db, conn.id)
    except YouTubeAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"YouTube token alinamadi: {exc}",
        )

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
            scope_ok = await _token_store.has_required_scope(db, conn.id)
            scope_hint = ""
            if resp.status_code == 403 and not scope_ok:
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
    snapshots: List[VideoStatsTrendItem]


@router.get("/video-stats/{video_id}/trend", response_model=VideoStatsTrendResponse)
async def get_video_stats_trend(video_id: str, db: AsyncSession = Depends(get_db)):
    """
    Belirli bir videonun zaman serisi istatistiklerini dondurur.
    Local snapshot verisi kullanir — YouTube Analytics API scope gerektirmez.
    """
    import json
    from app.db.models import VideoStatsSnapshot, PublishRecord

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


# ---------------------------------------------------------------------------
# Revoke
# ---------------------------------------------------------------------------


@router.delete("/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_credentials(
    connection_id: str = Query(..., description="Silinecek PlatformConnection ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Belirtilen YouTube baglantisinin kimlik bilgilerini siler.

    PlatformCredential kaydini siler, PlatformConnection durumunu gunceller.
    Eski JSON token dosyasina dokunmaz (legacy cleanup icin kalir).
    """
    conn = await db.get(PlatformConnection, connection_id)
    if not conn or conn.platform != "youtube":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"YouTube baglantisi bulunamadi: {connection_id}",
        )

    # Delete PlatformCredential
    cred_stmt = select(PlatformCredential).where(
        PlatformCredential.platform_connection_id == connection_id
    )
    cred_result = await db.execute(cred_stmt)
    cred = cred_result.scalars().first()
    if cred:
        await db.delete(cred)

    # Update connection state
    conn.auth_state = "revoked"
    conn.token_state = "invalid"
    conn.connection_status = "disconnected"
    conn.requires_reauth = True

    await db.commit()

    logger.info("YouTube baglanti kimlik bilgileri silindi: connection=%s", connection_id)
    await write_audit_log(
        db,
        action="youtube.revoke",
        entity_type="youtube_oauth",
        entity_id=connection_id,
    )
