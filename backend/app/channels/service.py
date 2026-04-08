"""
Channel Profile service — Faz 2.

Business logic for channel profile CRUD.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChannelProfile
from app.channels.schemas import ChannelProfileCreate, ChannelProfileUpdate

logger = logging.getLogger(__name__)


async def list_channel_profiles(
    db: AsyncSession,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[ChannelProfile]:
    q = select(ChannelProfile).order_by(ChannelProfile.created_at.desc())
    if user_id:
        q = q.where(ChannelProfile.user_id == user_id)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_channel_profile(
    db: AsyncSession, profile_id: str
) -> Optional[ChannelProfile]:
    return await db.get(ChannelProfile, profile_id)


async def create_channel_profile(
    db: AsyncSession, payload: ChannelProfileCreate
) -> ChannelProfile:
    profile = ChannelProfile(
        user_id=payload.user_id,
        profile_name=payload.profile_name,
        channel_slug=payload.channel_slug,
        profile_type=payload.profile_type,
        default_language=payload.default_language,
        default_content_mode=payload.default_content_mode,
        brand_profile_id=payload.brand_profile_id,
        automation_policy_id=payload.automation_policy_id,
        notes=payload.notes,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    logger.info("ChannelProfile created: id=%s slug=%s", profile.id, profile.channel_slug)
    return profile


async def update_channel_profile(
    db: AsyncSession, profile_id: str, payload: ChannelProfileUpdate
) -> Optional[ChannelProfile]:
    profile = await db.get(ChannelProfile, profile_id)
    if not profile:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


async def delete_channel_profile(
    db: AsyncSession, profile_id: str
) -> Optional[ChannelProfile]:
    """Soft delete — set status='archived'."""
    profile = await db.get(ChannelProfile, profile_id)
    if not profile:
        return None
    profile.status = "archived"
    await db.commit()
    await db.refresh(profile)
    return profile
