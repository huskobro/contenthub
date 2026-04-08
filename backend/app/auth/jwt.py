"""
JWT token encode/decode utilities — Faz 3.

Creates and verifies access + refresh tokens using python-jose.
Secret and expiry settings use hardcoded dev defaults for now;
will be wired to Settings Registry keys later.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

# ---------------------------------------------------------------------------
# Settings keys (will be added to KNOWN_SETTINGS in a future step):
#   auth.jwt_secret
#   auth.jwt_algorithm
#   auth.access_token_expire_minutes
#   auth.refresh_token_expire_days
# ---------------------------------------------------------------------------

SECRET_KEY = "contenthub-dev-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


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
