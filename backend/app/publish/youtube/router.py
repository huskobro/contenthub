"""
YouTube OAuth2 Router — M7-C2.

Admin panelden YouTube yetkilendirmesi ve token yönetimi.

Endpoint'ler:
  GET  /publish/youtube/auth-url      : OAuth2 yetkilendirme URL'i üretir
  POST /publish/youtube/auth-callback : Authorization code'u token ile takas eder
  GET  /publish/youtube/status        : Token durumu (var mı / süresi dolmuş mu)
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

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
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
