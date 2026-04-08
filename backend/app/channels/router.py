"""
Channel Profile router — Faz 2.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.channels import service
from app.channels.schemas import (
    ChannelProfileCreate,
    ChannelProfileUpdate,
    ChannelProfileResponse,
)

router = APIRouter(prefix="/channel-profiles", tags=["Channel Profiles"])


@router.get("", response_model=List[ChannelProfileResponse])
async def list_channel_profiles(
    user_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_channel_profiles(db, user_id=user_id, skip=skip, limit=limit)


@router.post("", response_model=ChannelProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_channel_profile(
    payload: ChannelProfileCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await service.create_channel_profile(db, payload)
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bu user_id + channel_slug kombinasyonu zaten mevcut.",
            )
        raise


@router.get("/{profile_id}", response_model=ChannelProfileResponse)
async def get_channel_profile(
    profile_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_channel_profile(db, profile_id)
    if not result:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    return result


@router.patch("/{profile_id}", response_model=ChannelProfileResponse)
async def update_channel_profile(
    profile_id: str,
    payload: ChannelProfileUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await service.update_channel_profile(db, profile_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    return result


@router.delete("/{profile_id}", response_model=ChannelProfileResponse)
async def delete_channel_profile(
    profile_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — status='archived'."""
    result = await service.delete_channel_profile(db, profile_id)
    if not result:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    return result
