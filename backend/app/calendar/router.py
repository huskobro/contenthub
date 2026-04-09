"""
Calendar router — Faz 14.

Exposes unified calendar events aggregated from
ContentProject, PublishRecord, PlatformPost.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.calendar.schemas import CalendarEvent
from app.calendar.service import get_calendar_events

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/events", response_model=list[CalendarEvent])
async def list_calendar_events(
    start_date: datetime = Query(..., description="Baslangic tarihi (ISO)"),
    end_date: datetime = Query(..., description="Bitis tarihi (ISO)"),
    owner_user_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None, description="content_project | publish_record | platform_post"),
    db: AsyncSession = Depends(get_db),
) -> list[CalendarEvent]:
    """Return unified calendar events within [start_date, end_date]."""
    return await get_calendar_events(
        db=db,
        start_date=start_date,
        end_date=end_date,
        owner_user_id=owner_user_id,
        channel_profile_id=channel_profile_id,
        platform=platform,
        event_type=event_type,
    )
