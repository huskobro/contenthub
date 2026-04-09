"""
JWT token encode/decode utilities — Faz 3 + Sprint 1 hardening.

Creates and verifies access + refresh tokens using python-jose.
Secret is loaded from CONTENTHUB_JWT_SECRET env var (via Settings).
If env var is empty, a dev-only fallback is used with a startup warning.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt  # noqa: F401 — JWTError re-exported for consumers

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Resolved settings — read once at import time from env/config
# ---------------------------------------------------------------------------

_DEV_FALLBACK_SECRET = "contenthub-dev-secret-DO-NOT-USE-IN-PRODUCTION"

if settings.jwt_secret:
    SECRET_KEY = settings.jwt_secret
else:
    SECRET_KEY = _DEV_FALLBACK_SECRET
    logger.warning(
        "CONTENTHUB_JWT_SECRET is not set — using insecure dev fallback. "
        "Set CONTENTHUB_JWT_SECRET in .env or environment for production."
    )

ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.jwt_refresh_token_expire_days


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a short-lived access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token. Raises JWTError on failure."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
