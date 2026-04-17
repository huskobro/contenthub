"""
Brand Profile service — Faz 2 + Phase Final F2.2 ownership guard.

Business logic for brand profile CRUD.

Ownership:
  - `list_brand_profiles` accepts optional `caller_ctx`; when set, query
    is scoped via `apply_user_scope(BrandProfile, owner_field="owner_user_id")`.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, apply_user_scope
from app.db.models import BrandProfile
from app.brand_profiles.schemas import BrandProfileCreate, BrandProfileUpdate

logger = logging.getLogger(__name__)


async def list_brand_profiles(
    db: AsyncSession,
    *,
    caller_ctx: Optional[UserContext] = None,
    owner_user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[BrandProfile]:
    q = select(BrandProfile).order_by(BrandProfile.created_at.desc())

    # Defense-in-depth: non-admin caller baska bir owner'i goremez.
    if caller_ctx is not None:
        q = apply_user_scope(
            q, BrandProfile, user_context=caller_ctx, owner_field="owner_user_id"
        )

    if owner_user_id:
        q = q.where(BrandProfile.owner_user_id == owner_user_id)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_brand_profile(
    db: AsyncSession, profile_id: str
) -> Optional[BrandProfile]:
    return await db.get(BrandProfile, profile_id)


async def create_brand_profile(
    db: AsyncSession, payload: BrandProfileCreate
) -> BrandProfile:
    profile = BrandProfile(
        owner_user_id=payload.owner_user_id,
        brand_name=payload.brand_name,
        palette=payload.palette,
        typography=payload.typography,
        motion_style=payload.motion_style,
        logo_path=payload.logo_path,
        watermark_path=payload.watermark_path,
        watermark_position=payload.watermark_position,
        intro_template_id=payload.intro_template_id,
        outro_template_id=payload.outro_template_id,
        lower_third_defaults=payload.lower_third_defaults,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    logger.info("BrandProfile created: id=%s name=%s", profile.id, profile.brand_name)
    return profile


async def update_brand_profile(
    db: AsyncSession, profile_id: str, payload: BrandProfileUpdate
) -> Optional[BrandProfile]:
    profile = await db.get(BrandProfile, profile_id)
    if not profile:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


async def delete_brand_profile(
    db: AsyncSession, profile_id: str
) -> bool:
    """Hard delete."""
    profile = await db.get(BrandProfile, profile_id)
    if not profile:
        return False
    await db.delete(profile)
    await db.commit()
    return True
