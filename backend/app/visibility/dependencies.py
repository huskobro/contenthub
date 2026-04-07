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
    Extract caller role from request header.
    For MVP (localhost-only): admin by default if header absent.
    When auth is added later, this will read from JWT token.
    """
    if x_contenthub_role in ("admin", "user"):
        return x_contenthub_role
    return "admin"


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
