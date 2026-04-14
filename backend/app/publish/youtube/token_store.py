"""
YouTube OAuth2 Token Store — M7-C2 / Per-Connection DB Store.

İki store sınıfı:
  - LegacyFileTokenStore: Eski global JSON dosyası (artık kullanılmıyor, referans için duruyor).
  - DBYouTubeTokenStore : PlatformCredential DB tablosu üzerinden per-connection token yönetimi.

OAuth2 akışı:
  1. Admin /publish/youtube/auth-url endpoint'ini çağırır (channel_profile_id ile).
  2. Browser'da Google consent sayfası açılır.
  3. Redirect URL'deki code parametresi /publish/youtube/auth-callback endpoint'ine POST edilir.
  4. PlatformConnection + PlatformCredential kayıtları oluşturulur/güncellenir.
  5. Bundan sonra upload/activate zinciri DBYouTubeTokenStore üzerinden çalışır.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import quote, urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.crypto import get_token_cipher
from app.publish.youtube.errors import YouTubeAuthError

logger = logging.getLogger(__name__)

# Google OAuth2 endpoint'leri — sabit, hardcode edilebilir (public bilgi)
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
# youtube: tam YouTube yönetimi (kanal/video okuma + upload)
# youtube.upload tek başına channels?mine=true için yetersiz (HTTP 403)
YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube"
# yt-analytics.readonly: Analytics API v2 reports.query erisimi (Sprint 1 / Faz YT-A1)
YOUTUBE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly"
# Butunlesik scope listesi — OAuth consent'te her iki scope birlikte istenir.
YOUTUBE_SCOPES = [YOUTUBE_SCOPE, YOUTUBE_ANALYTICS_SCOPE]
YOUTUBE_SCOPE_STRING = " ".join(YOUTUBE_SCOPES)

# Token dosyası adı — data_dir altında (legacy)
TOKEN_FILENAME = "youtube_tokens.json"


def _token_path() -> Path:
    return settings.data_dir / TOKEN_FILENAME


def _now_ts() -> float:
    return datetime.now(timezone.utc).timestamp()


# ============================================================================
# DB-backed per-connection token store (active)
# ============================================================================


class DBYouTubeTokenStore:
    """Per-connection YouTube token store backed by PlatformCredential DB table."""

    def __init__(self, http_client: Optional[httpx.AsyncClient] = None):
        self._http_client = http_client

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is not None:
            return self._http_client
        return httpx.AsyncClient(timeout=30.0)

    # -- Credential read helpers ------------------------------------------

    async def load_credential(
        self, db: AsyncSession, connection_id: str,
    ) -> Optional["PlatformCredential"]:
        """Load PlatformCredential for a connection."""
        from app.db.models import PlatformCredential

        stmt = select(PlatformCredential).where(
            PlatformCredential.platform_connection_id == connection_id
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def has_credentials(self, db: AsyncSession, connection_id: str) -> bool:
        cred = await self.load_credential(db, connection_id)
        return cred is not None and bool(cred.refresh_token) and bool(cred.client_id)

    async def has_required_scope(self, db: AsyncSession, connection_id: str) -> bool:
        cred = await self.load_credential(db, connection_id)
        if not cred or not cred.scopes:
            return False
        granted_scopes = cred.scopes.split()
        return YOUTUBE_SCOPE in granted_scopes

    async def has_analytics_scope(self, db: AsyncSession, connection_id: str) -> bool:
        """yt-analytics.readonly scope grant edilmis mi?"""
        cred = await self.load_credential(db, connection_id)
        if not cred or not cred.scopes:
            return False
        granted_scopes = cred.scopes.split()
        return YOUTUBE_ANALYTICS_SCOPE in granted_scopes

    # -- Credential write ------------------------------------------------

    async def save_from_auth_response(
        self,
        db: AsyncSession,
        connection_id: str,
        client_id: str,
        client_secret: str,
        auth_response: dict,
    ) -> None:
        """Save OAuth tokens to PlatformCredential table (upsert).

        Tokens and client_secret are encrypted at rest via TokenCipher
        (Publish Core Hardening Pack — Gate 1).
        """
        from app.db.models import PlatformCredential

        expires_in = auth_response.get("expires_in", 3600)
        expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
        scope = auth_response.get("scope", YOUTUBE_SCOPE)

        cipher = get_token_cipher()
        enc_access = cipher.encrypt(auth_response["access_token"])
        enc_refresh_raw = auth_response.get("refresh_token", "")
        enc_client_secret = cipher.encrypt(client_secret) if client_secret else client_secret

        cred = await self.load_credential(db, connection_id)
        if cred:
            cred.access_token = enc_access
            # If Google did not return a new refresh_token, keep existing one (already encrypted).
            if enc_refresh_raw:
                cred.refresh_token = cipher.encrypt(enc_refresh_raw)
            elif not cred.refresh_token:
                cred.refresh_token = ""
            cred.token_expiry = expiry
            cred.client_id = client_id
            cred.client_secret = enc_client_secret
            cred.scopes = scope
            cred.raw_token_response = json.dumps(auth_response)
        else:
            cred = PlatformCredential(
                platform_connection_id=connection_id,
                access_token=enc_access,
                refresh_token=cipher.encrypt(enc_refresh_raw) if enc_refresh_raw else "",
                token_expiry=expiry,
                client_id=client_id,
                client_secret=enc_client_secret,
                scopes=scope,
                raw_token_response=json.dumps(auth_response),
            )
            db.add(cred)
        await db.commit()

    # -- Access token (with auto-refresh) --------------------------------

    async def get_access_token(self, db: AsyncSession, connection_id: str) -> str:
        """Get valid access token, refreshing if needed.

        Transparently decrypts at-rest ciphertext (or legacy plaintext) before
        returning. Legacy plaintext rows are left untouched here; they get
        encrypted on the next refresh cycle (lazy migration).
        """
        cred = await self.load_credential(db, connection_id)
        if not cred or not cred.refresh_token:
            raise YouTubeAuthError(
                "YouTube OAuth2 credential bulunamadi. Kanal ayarlarindan yeniden yetkilendirme yapin."
            )

        cipher = get_token_cipher()

        now = datetime.now(timezone.utc)
        if cred.token_expiry and now < cred.token_expiry:
            return cipher.decrypt(cred.access_token)

        logger.info(
            "YouTube access token suresi dolmus (connection=%s) — yenileniyor.",
            connection_id,
        )
        return await self._refresh_access_token(db, cred)

    async def _refresh_access_token(
        self, db: AsyncSession, cred: "PlatformCredential",
    ) -> str:
        cipher = get_token_cipher()
        payload = {
            "client_id": cred.client_id,
            "client_secret": cipher.decrypt(cred.client_secret),
            "refresh_token": cipher.decrypt(cred.refresh_token),
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
                f"Token yenileme basarisiz: HTTP {resp.status_code} — {resp.text[:200]}",
                error_code="token_refresh_failed",
            )

        data = resp.json()
        if "access_token" not in data:
            raise YouTubeAuthError(
                f"Token yanitinda access_token yok: {data}",
                error_code="token_refresh_invalid_response",
            )

        expires_in = data.get("expires_in", 3600)
        new_access_token = data["access_token"]
        # Store encrypted at rest.
        cred.access_token = cipher.encrypt(new_access_token)
        cred.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
        if "refresh_token" in data:
            cred.refresh_token = cipher.encrypt(data["refresh_token"])
        # Also re-encrypt client_secret if it was legacy plaintext — opportunistic.
        if cred.client_secret and not cred.client_secret.startswith("enc:v1:"):
            cred.client_secret = cipher.encrypt(cred.client_secret)
        await db.commit()

        logger.info(
            "YouTube access token basariyla yenilendi (connection=%s).",
            cred.platform_connection_id,
        )
        return new_access_token

    # -- OAuth URL & code exchange (no DB, pure HTTP) --------------------

    def get_auth_url(
        self, client_id: str, redirect_uri: str, state: str = "",
    ) -> str:
        """Google OAuth2 consent URL'i uretir (youtube + yt-analytics.readonly)."""
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": YOUTUBE_SCOPE_STRING,
            "access_type": "offline",
            "prompt": "select_account consent",
        }
        if state:
            params["state"] = state
        return f"{GOOGLE_AUTH_URL}?{urlencode(params, quote_via=quote)}"

    async def exchange_code_for_tokens(
        self,
        client_id: str,
        client_secret: str,
        code: str,
        redirect_uri: str,
    ) -> dict:
        """Authorization code'u access + refresh token ile takas eder."""
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
                f"Code exchange basarisiz: HTTP {resp.status_code} — {resp.text[:200]}",
                error_code="code_exchange_failed",
            )

        data = resp.json()
        logger.info(
            "Google token exchange yaniti — scope: %s, keys: %s",
            data.get("scope", "<yok>"),
            list(data.keys()),
        )
        if "access_token" not in data:
            raise YouTubeAuthError(
                f"Code exchange yanitinda access_token yok: {data}",
                error_code="code_exchange_invalid_response",
            )
        return data


# ============================================================================
# Legacy file-based token store (kept for reference / potential migration)
# ============================================================================


class LegacyFileTokenStore:
    """
    [LEGACY] Eski global JSON dosya tabanli YouTube OAuth2 token store.

    Artik kullanilmiyor — DBYouTubeTokenStore aktif store.
    Potansiyel migrasyon veya referans icin duruyor.
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

    def has_required_scope(self) -> bool:
        """
        Token'daki scope, mevcut YOUTUBE_SCOPE ile uyumlu mu?

        Eski `youtube.upload` scope'u `channels?mine=true` için yetersiz.
        Tam `youtube` scope'u gerekli. Uyumsuzluk varsa yeniden OAuth gerekir.

        Scope string'i boşlukla ayrılmış birden fazla scope içerebilir.
        Tam eşleşme kontrolü yapılır — substring match değil.
        """
        tokens = self._load_tokens()
        token_scope = tokens.get("scope", "")
        # Scope string boşlukla ayrılmış olabilir: "scope1 scope2"
        granted_scopes = token_scope.split()
        return YOUTUBE_SCOPE in granted_scopes

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
            "scope": YOUTUBE_SCOPE_STRING,
            "access_type": "offline",
            "prompt": "select_account consent",
            # include_granted_scopes kaldırıldı — eski scope inherit edilmesin,
            # tam scope listesi her seferinde yeniden istenir
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params, quote_via=quote)}"

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
        logger.info(
            "Google token exchange yanıtı — scope: %s, keys: %s",
            data.get("scope", "<yok>"),
            list(data.keys()),
        )
        if "access_token" not in data:
            raise YouTubeAuthError(
                f"Code exchange yanıtında access_token yok: {data}",
                error_code="code_exchange_invalid_response",
            )
        return data


# Backward-compat alias — adapter.py, playlists/service.py, comments/service.py
# still import YouTubeTokenStore. They use the legacy file-based store until migrated.
YouTubeTokenStore = LegacyFileTokenStore
