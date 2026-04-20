"""
Symmetric encryption at rest — merkezi cipher altyapısı.

Sağladığı iki ayrı cipher:
  1. TokenCipher  — OAuth tokens (prefix `enc:v1:`), PlatformCredential.
  2. SettingCipher — Settings Registry secret değerleri (prefix `enc:s1:`).
     API key'leri, provider credential'ları burada şifrelenir.

Design:
  * Fernet (AES-128-CBC + HMAC-SHA256) via `cryptography` package.
  * Prefix-based versioning — hem şifreli/plaintext ayrımı hem de cipher
    çeşidini ayırma sağlar. Yanlış cipher ile decrypt denenince doğru hata
    yüzeyine çıkar.
  * Legacy rows (no prefix) plaintext olarak geçer — lazy migration.
    Bir sonraki yazma (refresh / user edit) şifreli form üretir.
  * Key source: `CONTENTHUB_ENCRYPTION_KEY` env var (via settings).
    - Debug modda boşsa deterministik dev fallback + loud warning.
    - Production'da boşsa startup fail-fast.

Küçük secret'lar için — büyük blob'lar için değil.
"""

from __future__ import annotations

import base64
import hashlib
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

ENC_PREFIX = "enc:v1:"  # TokenCipher — OAuth tokens (backward-compat)
SETTING_ENC_PREFIX = "enc:s1:"  # SettingCipher — Settings Registry secrets
_DEV_FALLBACK_SEED = "contenthub-dev-encryption-fallback-not-for-production"

# Tüm bilinen şifreleme prefix'leri — mask helper'ları için tek kaynak.
ALL_ENC_PREFIXES = (ENC_PREFIX, SETTING_ENC_PREFIX)


def is_encrypted(value: object) -> bool:
    """Herhangi bir cipher prefix'i taşıyan string mi?"""
    return isinstance(value, str) and value.startswith(ALL_ENC_PREFIXES)


def _derive_fernet_key(raw_key: str) -> bytes:
    """
    Accept arbitrary-length raw key and derive a 32-byte urlsafe base64 key.

    If the input already looks like a valid Fernet key (44 chars, base64),
    it is used as-is. Otherwise SHA-256 digest is urlsafe-base64 encoded.
    """
    raw_key = (raw_key or "").strip()
    if not raw_key:
        raise ValueError("encryption key boş")
    # Try to use as-is if it's already a 44-char urlsafe-b64 key.
    try:
        decoded = base64.urlsafe_b64decode(raw_key.encode("utf-8"))
        if len(decoded) == 32:
            return raw_key.encode("utf-8")
    except Exception:
        pass
    # Derive deterministically from arbitrary string.
    digest = hashlib.sha256(raw_key.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


class TokenCipher:
    """
    Symmetric cipher for OAuth tokens.

    Usage:
        cipher = get_token_cipher()
        cred.access_token = cipher.encrypt(plain_token)
        plain = cipher.decrypt(cred.access_token)  # legacy plaintext pass-through
    """

    def __init__(self, key: str):
        self._fernet = Fernet(_derive_fernet_key(key))

    def encrypt(self, plaintext: Optional[str]) -> Optional[str]:
        """Encrypt. None/empty → returned as-is (no-op)."""
        if plaintext is None or plaintext == "":
            return plaintext
        if plaintext.startswith(ENC_PREFIX):
            # Already encrypted — defensive, avoid double-wrap.
            return plaintext
        token = self._fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")
        return f"{ENC_PREFIX}{token}"

    def decrypt(self, ciphertext: Optional[str]) -> Optional[str]:
        """
        Decrypt. Legacy plaintext (no prefix) is returned untouched to support
        lazy migration of pre-hardening rows.
        """
        if ciphertext is None or ciphertext == "":
            return ciphertext
        if not ciphertext.startswith(ENC_PREFIX):
            # Legacy row — return as plaintext, caller is responsible for
            # re-writing with encryption on next update.
            return ciphertext
        payload = ciphertext[len(ENC_PREFIX):]
        try:
            return self._fernet.decrypt(payload.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError(
                "Token decryption failed — encryption key mismatch veya veri bozuk."
            ) from exc


class SettingCipher:
    """
    Settings Registry secret değerleri için cipher.

    TokenCipher ile aynı Fernet key'i kullanır ama prefix (`enc:s1:`) farklıdır.
    Böylece:
      - bir OAuth token'ı yanlışlıkla setting olarak decrypt edilemez
      - prefix'ten hangi amaçla şifrelendiği anlaşılır
      - legacy plaintext (prefix'siz) credential satırları lazy migrate edilir

    save_credential / resolve_credential bu cipher üzerinden yazar/okur.
    """

    def __init__(self, key: str):
        self._fernet = Fernet(_derive_fernet_key(key))

    def encrypt(self, plaintext: Optional[str]) -> Optional[str]:
        """Şifrele. None/empty → olduğu gibi döner. Zaten şifreliyse idempotent."""
        if plaintext is None or plaintext == "":
            return plaintext
        if plaintext.startswith(SETTING_ENC_PREFIX):
            return plaintext
        if plaintext.startswith(ENC_PREFIX):
            # Token cipher prefix'i — setting'e yanlış tipte değer geldi.
            # Fail fast yerine kendi prefix'imizle yeniden sarmalarız ki
            # decrypt tarafında doğru cipher seçilsin.
            raise ValueError(
                "TokenCipher prefix'li değer SettingCipher ile şifrelenemez — "
                "yazmadan önce decrypt edin veya doğru cipher kullanın."
            )
        token = self._fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")
        return f"{SETTING_ENC_PREFIX}{token}"

    def decrypt(self, ciphertext: Optional[str]) -> Optional[str]:
        """
        Şifreyi çöz. Prefix yoksa legacy plaintext kabul edilir (lazy migration).
        Yanlış cipher prefix'i (`enc:v1:`) gelirse ValueError.
        """
        if ciphertext is None or ciphertext == "":
            return ciphertext
        if not ciphertext.startswith(SETTING_ENC_PREFIX):
            if ciphertext.startswith(ENC_PREFIX):
                raise ValueError(
                    "TokenCipher ciphertext'i SettingCipher ile decrypt edilemez."
                )
            # Prefix'siz → legacy plaintext (pre-hardening kayıt). Olduğu gibi geçer.
            return ciphertext
        payload = ciphertext[len(SETTING_ENC_PREFIX):]
        try:
            return self._fernet.decrypt(payload.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError(
                "Setting decryption failed — encryption key mismatch veya veri bozuk."
            ) from exc


_singleton: Optional[TokenCipher] = None
_setting_singleton: Optional[SettingCipher] = None


def _resolve_raw_key() -> str:
    """Tek otorite: .env CONTENTHUB_ENCRYPTION_KEY → dev fallback/hata."""
    # Lazy import to avoid circular dependency at module load.
    from app.core.config import settings

    raw = (settings.encryption_key or "").strip()
    if raw:
        return raw
    if settings.debug:
        logger.warning(
            "CONTENTHUB_ENCRYPTION_KEY unset — using DEV fallback. "
            "Do NOT use in production. Set the env var in .env."
        )
        return _DEV_FALLBACK_SEED
    raise RuntimeError(
        "CONTENTHUB_ENCRYPTION_KEY is required in non-debug mode. "
        "Generate one with: python -c 'from cryptography.fernet import Fernet; "
        "print(Fernet.generate_key().decode())'"
    )


def get_setting_cipher() -> SettingCipher:
    """Settings Registry secret'ları için process-wide SettingCipher singleton."""
    global _setting_singleton
    if _setting_singleton is not None:
        return _setting_singleton
    _setting_singleton = SettingCipher(_resolve_raw_key())
    return _setting_singleton


def get_token_cipher() -> TokenCipher:
    """Process-wide TokenCipher singleton. Key resolution _resolve_raw_key'de."""
    global _singleton
    if _singleton is not None:
        return _singleton
    _singleton = TokenCipher(_resolve_raw_key())
    return _singleton


def reset_token_cipher_for_tests() -> None:
    """Test helper — token cipher singleton'ını düşür."""
    global _singleton
    _singleton = None


def reset_setting_cipher_for_tests() -> None:
    """Test helper — setting cipher singleton'ını düşür."""
    global _setting_singleton
    _setting_singleton = None


def mask_credential_value(value: Optional[str], keep_tail: int = 4) -> str:
    """
    Credential değerini son `keep_tail` karakter hariç maskeleyerek döner.
    Şifreli (prefix'li) değer gelirse sabit bir sentinel döner — orijinal
    maskelenmez çünkü ciphertext kendisi zaten bilgi vermez.
    """
    if value is None or value == "":
        return ""
    if is_encrypted(value):
        return "\u25cf\u25cf\u25cf\u25cf (encrypted)"
    if len(value) <= keep_tail:
        return "\u25cf" * len(value)
    return "\u25cf" * (len(value) - keep_tail) + value[-keep_tail:]
