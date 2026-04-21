"""
Branding Center — aggregate HTTP router.

One resource, six sections + one apply action. Mounted under:
  /api/v1/branding-center/channels/{channel_id}

Ownership:
  - Non-admin can only operate on their own ChannelProfile.
  - Admin bypasses the ownership gate (audit log still records actor).

All section saves go through one router to keep the audit + ownership
gates in a single place.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.branding_center import service
from app.branding_center.schemas import (
    ApplyRequest,
    ApplyResponse,
    AudienceSection,
    BrandingCenterResponse,
    IdentitySection,
    MessagingSection,
    PlatformOutputSection,
    VisualSection,
)
from app.db.models import ChannelProfile
from app.db.session import get_db

router = APIRouter(
    prefix="/branding-center/channels",
    tags=["Branding Center"],
)


async def _load_channel_or_404(
    db: AsyncSession, channel_id: str
) -> ChannelProfile:
    channel = await db.get(ChannelProfile, channel_id)
    if channel is None:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    return channel


@router.get("/{channel_id}", response_model=BrandingCenterResponse)
async def get_branding_center(
    channel_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    channel = await _load_channel_or_404(db, channel_id)
    ensure_owner_or_admin(ctx, channel.user_id, resource_label="Kanal profili")
    return await service.get_branding_center(db, channel=channel)


@router.patch(
    "/{channel_id}/identity", response_model=BrandingCenterResponse
)
async def save_identity(
    channel_id: str,
    payload: IdentitySection,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    channel = await _load_channel_or_404(db, channel_id)
    ensure_owner_or_admin(ctx, channel.user_id, resource_label="Kanal profili")
    return await service.save_identity(db, ctx=ctx, channel=channel, payload=payload)


@router.patch(
    "/{channel_id}/audience", response_model=BrandingCenterResponse
)
async def save_audience(
    channel_id: str,
    payload: AudienceSection,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    channel = await _load_channel_or_404(db, channel_id)
    ensure_owner_or_admin(ctx, channel.user_id, resource_label="Kanal profili")
    return await service.save_audience(db, ctx=ctx, channel=channel, payload=payload)


@router.patch(
    "/{channel_id}/visual", response_model=BrandingCenterResponse
)
async def save_visual(
    channel_id: str,
    payload: VisualSection,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    channel = await _load_channel_or_404(db, channel_id)
    ensure_owner_or_admin(ctx, channel.user_id, resource_label="Kanal profili")
    return await service.save_visual(db, ctx=ctx, channel=channel, payload=payload)


@router.patch(
    "/{channel_id}/messaging", response_model=BrandingCenterResponse
)
async def save_messaging(
    channel_id: str,
    payload: MessagingSection,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    channel = await _load_channel_or_404(db, channel_id)
    ensure_owner_or_admin(ctx, channel.user_id, resource_label="Kanal profili")
    return await service.save_messaging(
        db, ctx=ctx, channel=channel, payload=payload
    )


@router.patch(
    "/{channel_id}/platform-output", response_model=BrandingCenterResponse
)
async def save_platform_output(
    channel_id: str,
    payload: PlatformOutputSection,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    channel = await _load_channel_or_404(db, channel_id)
    ensure_owner_or_admin(ctx, channel.user_id, resource_label="Kanal profili")
    return await service.save_platform_output(
        db, ctx=ctx, channel=channel, payload=payload
    )


@router.post(
    "/{channel_id}/apply",
    response_model=ApplyResponse,
    status_code=status.HTTP_200_OK,
)
async def apply_branding(
    channel_id: str,
    payload: ApplyRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    channel = await _load_channel_or_404(db, channel_id)
    ensure_owner_or_admin(ctx, channel.user_id, resource_label="Kanal profili")
    return await service.apply_branding(
        db, ctx=ctx, channel=channel, payload=payload
    )
