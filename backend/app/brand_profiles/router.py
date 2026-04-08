"""
Brand Profile router — Faz 2.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.brand_profiles import service
from app.brand_profiles.schemas import (
    BrandProfileCreate,
    BrandProfileUpdate,
    BrandProfileResponse,
)

router = APIRouter(prefix="/brand-profiles", tags=["Brand Profiles"])


@router.get("", response_model=List[BrandProfileResponse])
async def list_brand_profiles(
    owner_user_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_brand_profiles(
        db, owner_user_id=owner_user_id, skip=skip, limit=limit
    )


@router.post(
    "", response_model=BrandProfileResponse, status_code=status.HTTP_201_CREATED
)
async def create_brand_profile(
    payload: BrandProfileCreate,
    db: AsyncSession = Depends(get_db),
):
    return await service.create_brand_profile(db, payload)


@router.get("/{profile_id}", response_model=BrandProfileResponse)
async def get_brand_profile(
    profile_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_brand_profile(db, profile_id)
    if not result:
        raise HTTPException(status_code=404, detail="Marka profili bulunamadi.")
    return result


@router.patch("/{profile_id}", response_model=BrandProfileResponse)
async def update_brand_profile(
    profile_id: str,
    payload: BrandProfileUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await service.update_brand_profile(db, profile_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Marka profili bulunamadi.")
    return result


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand_profile(
    profile_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Hard delete."""
    deleted = await service.delete_brand_profile(db, profile_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Marka profili bulunamadi.")
