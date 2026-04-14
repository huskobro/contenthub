"""
Token encryption at rest — Publish Core Hardening Pack (Gate 1).

Provides transparent symmetric encryption for OAuth credentials (access_token,
refresh_token, client_secret) stored in the PlatformCredential table.

Design:
  * Fernet (AES-128-CBC + HMAC-SHA256) via `cryptography` package.
  * Prefix-based versioning: `enc:v1:` marks Fernet-encrypted payloads.
  * Legacy rows (no prefix) are returned as plaintext — lazy migration.
    The next token refresh re-writes them in encrypted form.
  * Key source: `CONTENTHUB_ENCRYPTION_KEY` env var (via settings).
    - If unset and `debug=True` → deterministic dev fallback + warning.
    - If unset and `debug=False` → startup must fail fast (caller's job).

Not intended for large blobs — tokens only.
"""

from __future__ import annotations

import base64
import hashlib
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

ENC_PREFIX = "enc:v1:"
_DEV_FALLBACK_SEED = "contenthub-dev-encryption-fallback-not-for-production"


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


_singleton: Optional[TokenCipher] = None


def get_token_cipher() -> TokenCipher:
    """
    Return the process-wide TokenCipher singleton.

    Reads `settings.encryption_key`. If empty, falls back to a deterministic
    dev key (with a loud warning) when debug mode is on; otherwise raises.
    """
    global _singleton
    if _singleton is not None:
        return _singleton
    # Lazy import to avoid circular dependency at module load.
    from app.core.config import settings

    raw = (settings.encryption_key or "").strip()
    if not raw:
        if settings.debug:
            logger.warning(
                "CONTENTHUB_ENCRYPTION_KEY unset — using DEV fallback. "
                "Do NOT use in production. Set the env var in .env."
            )
            raw = _DEV_FALLBACK_SEED
        else:
            raise RuntimeError(
                "CONTENTHUB_ENCRYPTION_KEY is required in non-debug mode. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())'"
            )
    _singleton = TokenCipher(raw)
    return _singleton


def reset_token_cipher_for_tests() -> None:
    """Test helper — drop the singleton so the next call re-reads settings."""
    global _singleton
    _singleton = None
