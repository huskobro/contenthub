"""
User router — M40.

CRUD endpoints for user management and per-user setting overrides.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.users import service
from app.users.schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserOverrideResponse,
    UserOverrideSetRequest,
)

router = APIRouter(prefix="/users", tags=["users"])


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=List[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db)):
    """List all users with override counts."""
    return await service.list_users(db)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user."""
    try:
        return await service.create_user(db, payload)
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bu e-posta adresi zaten kullanilmaktadir.",
            )
        raise


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single user."""
    result = await service.get_user(db, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi.")
    return result


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str, payload: UserUpdate, db: AsyncSession = Depends(get_db)
):
    """Partial update a user."""
    result = await service.update_user(db, user_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi.")
    return result


@router.delete("/{user_id}", response_model=UserResponse)
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    """Soft-delete a user (set status='inactive')."""
    result = await service.delete_user(db, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi.")
    return result


# ---------------------------------------------------------------------------
# User Setting Overrides
# ---------------------------------------------------------------------------

@router.get("/{user_id}/overrides", response_model=List[UserOverrideResponse])
async def list_overrides(user_id: str, db: AsyncSession = Depends(get_db)):
    """List all setting overrides for a user (admin view)."""
    return await service.list_user_overrides(db, user_id)


@router.put("/{user_id}/settings/{setting_key:path}")
async def set_override(
    user_id: str,
    setting_key: str,
    body: UserOverrideSetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Set or update a user's override for a specific setting."""
    try:
        return await service.set_user_override(db, user_id, setting_key, body.value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{user_id}/settings/{setting_key:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_override(
    user_id: str,
    setting_key: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a user's override for a specific setting (revert to admin default)."""
    deleted = await service.delete_user_override(db, user_id, setting_key)
    if not deleted:
        raise HTTPException(status_code=404, detail="Override bulunamadi.")
