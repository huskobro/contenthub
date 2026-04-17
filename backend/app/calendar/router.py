"""
Calendar router — Faz 14 + 14a + Phase Final F2.2 ownership guard.

Exposes unified calendar events aggregated from
ContentProject, PublishRecord, PlatformPost.

Ownership:
  - Non-admin caller sadece kendi `owner_user_id`'sine ait event'leri gorur.
    `owner_user_id` query parametresi spoof denemesi caller'in kendi id'si
    ile override edilir.
  - `channel_profile_id` parametresi non-admin icin sahiplik dogrulamasindan
    gecer.
  - Event kaynaklari (ContentProject / PublishRecord / PlatformPost)
    sahipliklerini `user_id` veya `channel_profile.user_id` uzerinden
    tasir; service katmani `owned_channel_ids` scope ile filtreler.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.calendar.schemas import CalendarEvent, ChannelCalendarContext
from app.calendar.service import get_calendar_events, get_channel_calendar_context
from app.db.models import ChannelProfile
from app.db.session import get_db

router = APIRouter(prefix="/calendar", tags=["calendar"])


async def _scope_channel_ids(db: AsyncSession, ctx: UserContext) -> Optional[List[str]]:
    """Non-admin icin sahip oldugu kanal id'leri (list). Admin icin None."""
    if ctx.is_admin:
        return None
    result = await db.execute(
        select(ChannelProfile.id).where(ChannelProfile.user_id == ctx.user_id)
    )
    return [row[0] for row in result.all()]


async def _enforce_channel_ownership(
    db: AsyncSession, ctx: UserContext, channel_profile_id: str
) -> None:
    if ctx.is_admin:
        return
    cp = await db.get(ChannelProfile, channel_profile_id)
    if cp is None:
        raise HTTPException(status_code=404, detail="Channel profile not found")
    ensure_owner_or_admin(ctx, cp.user_id, resource_label="channel")


@router.get("/events", response_model=list[CalendarEvent])
async def list_calendar_events(
    start_date: datetime = Query(..., description="Baslangic tarihi (ISO)"),
    end_date: datetime = Query(..., description="Bitis tarihi (ISO)"),
    owner_user_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None, description="content_project | publish_record | platform_post"),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
) -> list[CalendarEvent]:
    """Unified calendar events within [start_date, end_date] — owner-scoped."""
    # Spoof koruma: non-admin `owner_user_id` parametresini override ediyoruz.
    effective_owner: Optional[str]
    if ctx.is_admin:
        effective_owner = owner_user_id
    else:
        effective_owner = ctx.user_id

    # channel_profile_id parametresi non-admin icin sahiplik gate'inden gecer.
    if channel_profile_id is not None:
        await _enforce_channel_ownership(db, ctx, channel_profile_id)
        owned_channel_ids: Optional[List[str]] = [channel_profile_id]
    else:
        owned_channel_ids = await _scope_channel_ids(db, ctx)

    return await get_calendar_events(
        db=db,
        start_date=start_date,
        end_date=end_date,
        owner_user_id=effective_owner,
        channel_profile_id=channel_profile_id,
        platform=platform,
        event_type=event_type,
        owned_channel_ids=owned_channel_ids,
    )


@router.get("/channel-context/{channel_profile_id}", response_model=ChannelCalendarContext)
async def get_channel_context(
    channel_profile_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
) -> ChannelCalendarContext:
    """Policy + inbox summary for a channel (owner or admin)."""
    await _enforce_channel_ownership(db, ctx, channel_profile_id)
    return await get_channel_calendar_context(db, channel_profile_id)
