"""
Auth dependencies for FastAPI endpoints — Faz 3 + Sprint 1 hardening.

Provides get_current_user_optional, get_current_user, require_admin, require_user.

Sprint 1: Legacy X-ContentHub-User-Id header bypass is only active when
CONTENTHUB_DEBUG=true (dev/localhost). In non-debug mode, only JWT tokens
are accepted for authentication.
"""

import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.auth.jwt import decode_token
from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_contenthub_user_id: Optional[str] = Header(None, alias="X-ContentHub-User-Id"),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Returns the authenticated user or None.

    Resolution order:
    1. JWT Bearer token from Authorization header
    2. Legacy header-based auth (X-ContentHub-User-Id) — only if DEBUG mode
    3. None
    """
    # --- 1. Try JWT token ---
    if credentials and credentials.credentials:
        try:
            payload = decode_token(credentials.credentials)
            if payload.get("type") != "access":
                return None
            user_id = payload.get("sub")
            if not user_id:
                return None
            user = await db.get(User, user_id)
            if user and user.status == "active":
                return user
            return None
        except JWTError:
            # Invalid token — don't fall back, return None
            return None

    # --- 2. Fall back to legacy header (dev-only) ---
    if settings.debug and x_contenthub_user_id and len(x_contenthub_user_id.strip()) >= 32:
        user_id_clean = x_contenthub_user_id.strip()
        user = await db.get(User, user_id_clean)
        if user and user.status == "active":
            logger.debug("Legacy header auth for user %s (debug mode only)", user_id_clean)
            return user

    return None


async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Requires authentication. Raises 401 if not authenticated."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kimlik dogrulama gerekli",
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Requires admin role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin yetkisi gerekli",
        )
    return user


async def require_user(user: User = Depends(get_current_user)) -> User:
    """Requires at least user role (admin also passes)."""
    return user
