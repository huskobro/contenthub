"""
Brand Profile router — Faz 2 + Phase Final F2.2 ownership guard.

Endpoints:
  GET    /brand-profiles              — Listele (owner-scoped; admin hepsini gorur)
  POST   /brand-profiles              — Olustur (caller kendi owner_user_id'sine zorlanir)
  GET    /brand-profiles/{profile_id} — Detay (owner or admin)
  PATCH  /brand-profiles/{profile_id} — Guncelle (owner or admin)
  DELETE /brand-profiles/{profile_id} — Sil (owner or admin)

Ownership:
  - `BrandProfile.owner_user_id` dogrudan FK.
  - Liste query'si service katmaninda `apply_user_scope` ile filtrelenir.
  - Create'de non-admin `owner_user_id` alanini kendi id'si disinda
    dolduramaz.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.brand_profiles import service
from app.brand_profiles.schemas import (
    BrandProfileCreate,
    BrandProfileResponse,
    BrandProfileUpdate,
)
from app.db.session import get_db

router = APIRouter(prefix="/brand-profiles", tags=["Brand Profiles"])


def _enforce_profile_ownership(ctx: UserContext, profile) -> None:
    if ctx.is_admin:
        return
    ensure_owner_or_admin(ctx, profile.owner_user_id, resource_label="brand profile")


@router.get("", response_model=List[BrandProfileResponse])
async def list_brand_profiles(
    owner_user_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Marka profillerini listele — owner-scoped for non-admin."""
    # Spoof koruma: non-admin `owner_user_id` parametresi gecse bile kendi
    # id'si ile override edilir.
    effective_owner: Optional[str]
    if ctx.is_admin:
        effective_owner = owner_user_id
    else:
        effective_owner = ctx.user_id

    return await service.list_brand_profiles(
        db,
        caller_ctx=ctx,
        owner_user_id=effective_owner,
        skip=skip,
        limit=limit,
    )


@router.post(
    "", response_model=BrandProfileResponse, status_code=status.HTTP_201_CREATED
)
async def create_brand_profile(
    payload: BrandProfileCreate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Yeni marka profili olustur (non-admin kendi id'si disinda yazamaz)."""
    if not ctx.is_admin and payload.owner_user_id != ctx.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Baska bir kullanici adina marka profili olusturamazsiniz",
        )
    return await service.create_brand_profile(db, payload)


@router.get("/{profile_id}", response_model=BrandProfileResponse)
async def get_brand_profile(
    profile_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_brand_profile(db, profile_id)
    if not result:
        raise HTTPException(status_code=404, detail="Marka profili bulunamadi.")
    _enforce_profile_ownership(ctx, result)
    return result


@router.patch("/{profile_id}", response_model=BrandProfileResponse)
async def update_brand_profile(
    profile_id: str,
    payload: BrandProfileUpdate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    existing = await service.get_brand_profile(db, profile_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Marka profili bulunamadi.")
    _enforce_profile_ownership(ctx, existing)

    result = await service.update_brand_profile(db, profile_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Marka profili bulunamadi.")
    return result


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand_profile(
    profile_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Hard delete (owner or admin)."""
    existing = await service.get_brand_profile(db, profile_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Marka profili bulunamadi.")
    _enforce_profile_ownership(ctx, existing)

    deleted = await service.delete_brand_profile(db, profile_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Marka profili bulunamadi.")
