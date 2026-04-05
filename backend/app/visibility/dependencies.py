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

from fastapi import Depends, HTTPException, status
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
