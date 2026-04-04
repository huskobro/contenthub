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

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.publish.youtube.token_store import YouTubeTokenStore
from app.publish.youtube.errors import YouTubeAuthError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/publish/youtube", tags=["publish-youtube"])

_token_store = YouTubeTokenStore()


# ---------------------------------------------------------------------------
# Request / Response şemaları (bu router'a özel, küçük, local)
# ---------------------------------------------------------------------------

class AuthUrlRequest(BaseModel):
    client_id: str
    redirect_uri: str


class AuthUrlResponse(BaseModel):
    auth_url: str


class AuthCallbackRequest(BaseModel):
    client_id: str
    client_secret: str
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
    client_id: str,
    redirect_uri: str,
):
    """
    Google OAuth2 yetkilendirme URL'i döndürür.

    Admin bu URL'i browser'da açarak Google onay sayfasına gider.
    Onay sonrası Google, redirect_uri'ye authorization code ile döner.
    """
    try:
        auth_url = _token_store.get_auth_url(
            client_id=client_id,
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
async def auth_callback(body: AuthCallbackRequest):
    """
    Authorization code'u access + refresh token ile takas eder ve kaydeder.

    Bu endpoint Google'ın redirect_uri'sine yönlendirmesinden sonra
    admin panel tarafından çağrılır.

    Body:
        client_id     : Google API Console client ID
        client_secret : Google API Console client secret
        code          : OAuth2 authorization code
        redirect_uri  : /auth-url'de kullanılan aynı redirect URI
    """
    try:
        token_data = await _token_store.exchange_code_for_tokens(
            client_id=body.client_id,
            client_secret=body.client_secret,
            code=body.code,
            redirect_uri=body.redirect_uri,
        )
        _token_store.save_from_auth_response(
            client_id=body.client_id,
            client_secret=body.client_secret,
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
