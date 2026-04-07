"""
YouTube OAuth2 Token Store — M7-C2.

OAuth2 credential'larını yerel dosyada saklar ve yeniler.
Token dosyası: data/youtube_tokens.json

Tasarım kuralları (M7):
  - Token dosyası yolu config üzerinden okunur; hardcode edilmez.
  - Token yoksa YouTubeAuthError fırlatılır — sessiz başarısızlık yok.
  - Refresh token mevcutsa access token otomatik yenilenir.
  - Bu modül HTTP çağrısı yapar (Google OAuth2 token endpoint).
    Bağımlılığı test edilebilir: httpx.AsyncClient dışarıdan inject edilebilir.
  - Token dosyası credential içerdiğinden .gitignore'da olmalıdır.

OAuth2 akışı:
  1. Admin /publish/youtube/auth-url endpoint'ini çağırır.
  2. Browser'da Google consent sayfası açılır.
  3. Redirect URL'deki code parametresi /publish/youtube/auth-callback endpoint'ine POST edilir.
  4. Token dosyası oluşturulur.
  5. Bundan sonra upload/activate zinciri token_store üzerinden çalışır.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.publish.youtube.errors import YouTubeAuthError

logger = logging.getLogger(__name__)

# Google OAuth2 endpoint'leri — sabit, hardcode edilebilir (public bilgi)
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.upload"

# Token dosyası adı — data_dir altında
TOKEN_FILENAME = "youtube_tokens.json"


def _token_path() -> Path:
    return settings.data_dir / TOKEN_FILENAME


def _now_ts() -> float:
    return datetime.now(timezone.utc).timestamp()


class YouTubeTokenStore:
    """
    YouTube OAuth2 credential saklama ve yenileme.

    Token dosyası yapısı:
    {
        "access_token": "ya29.xxx",
        "refresh_token": "1//xxx",
        "client_id": "xxx.apps.googleusercontent.com",
        "client_secret": "xxx",
        "token_expiry": 1700000000.0,   # Unix timestamp (UTC)
        "scope": "https://www.googleapis.com/auth/youtube.upload"
    }

    Güvenlik notu:
      Token dosyası hassas veri içerir. data/ dizini .gitignore'da olmalıdır.
      Bu ContentHub'ın localhost-first mimarisinin parçasıdır.
    """

    def __init__(self, http_client: Optional[httpx.AsyncClient] = None):
        """
        Args:
            http_client : Test için inject edilebilir. None ise yeni client oluşturulur.
        """
        self._http_client = http_client

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is not None:
            return self._http_client
        return httpx.AsyncClient(timeout=30.0)

    def _load_tokens(self) -> dict:
        """Token dosyasını okur. Yoksa boş dict döner."""
        path = _token_path()
        if not path.exists():
            return {}
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as err:
            logger.error("Token dosyası okunamadı: %s — %s", path, err)
            return {}

    def _save_tokens(self, tokens: dict) -> None:
        """Token dict'ini dosyaya yazar."""
        path = _token_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(tokens, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info("YouTube token dosyası güncellendi: %s", path)

    def has_credentials(self) -> bool:
        """Geçerli (en azından refresh token içeren) credential mevcut mu?"""
        tokens = self._load_tokens()
        return bool(tokens.get("refresh_token") and tokens.get("client_id"))

    def save_from_auth_response(
        self,
        client_id: str,
        client_secret: str,
        auth_response: dict,
    ) -> None:
        """
        OAuth2 code exchange yanıtını token dosyasına kaydeder.

        Args:
            client_id      : Google API Console'dan alınan client ID.
            client_secret  : Google API Console'dan alınan client secret.
            auth_response  : /token endpoint yanıtı (access_token, refresh_token, expires_in).
        """
        expires_in = auth_response.get("expires_in", 3600)
        tokens = {
            "access_token": auth_response["access_token"],
            "refresh_token": auth_response.get("refresh_token", ""),
            "client_id": client_id,
            "client_secret": client_secret,
            "token_expiry": _now_ts() + expires_in - 60,  # 60 saniye güvenlik payı
            "scope": auth_response.get("scope", YOUTUBE_SCOPE),
        }
        self._save_tokens(tokens)

    def _is_token_expired(self, tokens: dict) -> bool:
        """Access token süresi dolmuş mu?"""
        expiry = tokens.get("token_expiry", 0)
        return _now_ts() >= expiry

    async def get_access_token(self) -> str:
        """
        Geçerli bir access token döndürür.

        Token süresi dolmuşsa refresh token ile yeniler.
        Token yoksa veya refresh başarısızsa YouTubeAuthError fırlatır.
        """
        tokens = self._load_tokens()
        if not tokens.get("refresh_token"):
            raise YouTubeAuthError(
                "YouTube OAuth2 credential bulunamadı. "
                "Admin panelinden yeniden yetkilendirme yapın."
            )
        if not self._is_token_expired(tokens):
            return tokens["access_token"]

        # Refresh gerekiyor
        logger.info("YouTube access token süresi dolmuş — yenileniyor.")
        refreshed = await self._refresh_access_token(tokens)
        return refreshed

    async def _refresh_access_token(self, tokens: dict) -> str:
        """Refresh token kullanarak yeni access token alır."""
        payload = {
            "client_id": tokens["client_id"],
            "client_secret": tokens["client_secret"],
            "refresh_token": tokens["refresh_token"],
            "grant_type": "refresh_token",
        }
        client = self._get_client()
        should_close = self._http_client is None
        try:
            resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
        finally:
            if should_close:
                await client.aclose()

        if resp.status_code != 200:
            raise YouTubeAuthError(
                f"Token yenileme başarısız: HTTP {resp.status_code} — {resp.text[:200]}",
                error_code="token_refresh_failed",
            )

        data = resp.json()
        if "access_token" not in data:
            raise YouTubeAuthError(
                f"Token yanıtında access_token yok: {data}",
                error_code="token_refresh_invalid_response",
            )

        expires_in = data.get("expires_in", 3600)
        tokens["access_token"] = data["access_token"]
        tokens["token_expiry"] = _now_ts() + expires_in - 60
        # Refresh token bazen yanıtta güncellenir
        if "refresh_token" in data:
            tokens["refresh_token"] = data["refresh_token"]
        self._save_tokens(tokens)
        logger.info("YouTube access token başarıyla yenilendi.")
        return tokens["access_token"]

    def get_auth_url(self, client_id: str, redirect_uri: str) -> str:
        """
        Kullanıcıyı Google consent sayfasına yönlendirmek için URL üretir.

        Args:
            client_id    : Google API Console'dan alınan client ID.
            redirect_uri : OAuth callback URL'i.

        Returns:
            Google OAuth2 yetkilendirme URL'i.
        """
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": YOUTUBE_SCOPE,
            "access_type": "offline",
            "prompt": "select_account consent",
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(
        self,
        client_id: str,
        client_secret: str,
        code: str,
        redirect_uri: str,
    ) -> dict:
        """
        Authorization code'u access + refresh token ile takas eder.

        Returns:
            Token dict (access_token, refresh_token, expires_in, scope).
        Raises:
            YouTubeAuthError: Exchange başarısız.
        """
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        client = self._get_client()
        should_close = self._http_client is None
        try:
            resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
        finally:
            if should_close:
                await client.aclose()

        if resp.status_code != 200:
            raise YouTubeAuthError(
                f"Code exchange başarısız: HTTP {resp.status_code} — {resp.text[:200]}",
                error_code="code_exchange_failed",
            )

        data = resp.json()
        if "access_token" not in data:
            raise YouTubeAuthError(
                f"Code exchange yanıtında access_token yok: {data}",
                error_code="code_exchange_invalid_response",
            )
        return data
