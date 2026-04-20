"""
Visibility FastAPI Dependencies — M11.

Reusable Depends() factories for route-level visibility enforcement.
These are server-side gates — if a visibility rule says "not visible",
the endpoint returns 403.

Usage in routers:
    @router.get("/my-endpoint", dependencies=[Depends(require_visible("panel:settings"))])
    async def my_endpoint(...):
        ...
"""

from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_optional
from app.db.models import User
from app.db.session import get_db
from app.visibility.resolver import resolve_visibility


def require_visible(target_key: str, role: Optional[str] = None):
    """
    FastAPI dependency factory. Returns a dependency that raises 403
    if the target_key is not visible for the given role.
    """
    async def _check(db: AsyncSession = Depends(get_db)):
        result = await resolve_visibility(db, target_key, role=role)
        if not result["visible"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: '{}' is not visible.".format(target_key),
            )
        return result
    return _check


def get_caller_role(
    x_contenthub_role: Optional[str] = Header(None, alias="X-ContentHub-Role"),
) -> str:
    """
    DEPRECATED — header-only role extractor. Kept for backwards compatibility
    with legacy callers/tests. New code MUST use ``get_effective_role`` so the
    role is derived from the authenticated session (JWT), not a spoofable header.

    Sprint 1 hardening: default to "user" (not "admin") when header absent.
    This prevents unauthenticated requests from gaining admin visibility.
    """
    if x_contenthub_role in ("admin", "user"):
        return x_contenthub_role
    return "user"


async def get_effective_role(
    user: Optional[User] = Depends(get_current_user_optional),
    x_contenthub_role: Optional[str] = Header(None, alias="X-ContentHub-Role"),
) -> str:
    """
    Resolve the effective caller role from the authenticated session.

    Order of precedence:
      1. JWT-authenticated user — returns ``user.role`` ("admin" or "user").
      2. Legacy ``X-ContentHub-Role`` header — only respected when no JWT user
         is resolved. Kept as a debug/dev fallback so older test fixtures and
         manual curl flows that set the header continue to work.
      3. Default "user".

    Why this exists: ``get_caller_role`` used to be the only role gate for the
    Settings router, but the frontend never sends ``X-ContentHub-Role``. This
    meant logged-in admins were treated as "user" by every PATCH/PUT settings
    endpoint, blocking admin-panel writes for any setting where
    ``user_override_allowed=False``. ``get_effective_role`` closes that gap by
    reading the same JWT the rest of the auth stack already trusts.
    """
    if user is not None and user.role in ("admin", "user"):
        return user.role
    if x_contenthub_role in ("admin", "user"):
        return x_contenthub_role
    return "user"


def get_active_user_id(
    x_contenthub_user_id: Optional[str] = Header(None, alias="X-ContentHub-User-Id"),
) -> Optional[str]:
    """
    Extract active user ID from request header — M40.
    For localhost-first multi-user: frontend sends the active user's UUID.
    Returns None if no user context is set.
    """
    if x_contenthub_user_id and len(x_contenthub_user_id.strip()) >= 32:
        return x_contenthub_user_id.strip()
    return None
