"""
Calendar aggregation service — Faz 14.

Aggregates scheduling data from ContentProject, PublishRecord, PlatformPost
into unified CalendarEvent list.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ContentProject, PublishRecord, PlatformPost
from app.calendar.schemas import CalendarEvent

logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_lt(dt_a: datetime, dt_b: datetime) -> bool:
    """Compare two datetimes safely even if one is naive and other is aware."""
    a = dt_a.replace(tzinfo=None) if dt_a.tzinfo else dt_a
    b = dt_b.replace(tzinfo=None) if dt_b.tzinfo else dt_b
    return a < b


async def get_calendar_events(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime,
    owner_user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
    event_type: Optional[str] = None,
) -> list[CalendarEvent]:
    """
    Aggregate calendar events from multiple sources.

    Returns unified CalendarEvent list sorted by start_at.
    """
    events: list[CalendarEvent] = []
    now = _now_utc()

    # --- ContentProject events (deadline_at) ---
    if event_type is None or event_type == "content_project":
        events.extend(
            await _collect_project_events(
                db, start_date, end_date, owner_user_id,
                channel_profile_id, now,
            )
        )

    # --- PublishRecord events (scheduled_at / published_at) ---
    if event_type is None or event_type == "publish_record":
        events.extend(
            await _collect_publish_events(
                db, start_date, end_date, owner_user_id,
                channel_profile_id, platform, now,
            )
        )

    # --- PlatformPost events (scheduled_for / posted_at) ---
    if event_type is None or event_type == "platform_post":
        events.extend(
            await _collect_post_events(
                db, start_date, end_date, owner_user_id,
                channel_profile_id, platform, now,
            )
        )

    # Sort by start_at
    events.sort(key=lambda e: e.start_at)
    return events


async def _collect_project_events(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime,
    owner_user_id: Optional[str],
    channel_profile_id: Optional[str],
    now: datetime,
) -> list[CalendarEvent]:
    """Collect ContentProject deadline events."""
    q = select(ContentProject).where(
        ContentProject.deadline_at.isnot(None),
        ContentProject.deadline_at >= start_date,
        ContentProject.deadline_at <= end_date,
    )
    if owner_user_id:
        q = q.where(ContentProject.user_id == owner_user_id)
    if channel_profile_id:
        q = q.where(ContentProject.channel_profile_id == channel_profile_id)
    q = q.limit(200)

    result = await db.execute(q)
    projects = result.scalars().all()

    events = []
    for p in projects:
        is_overdue = (
            _safe_lt(p.deadline_at, now)
            and p.content_status not in ("completed", "archived")
        )
        events.append(CalendarEvent(
            id=f"proj-{p.id}",
            event_type="content_project",
            title=p.title or f"Proje: {p.module_type}",
            channel_profile_id=p.channel_profile_id,
            owner_user_id=p.user_id,
            related_project_id=p.id,
            start_at=p.deadline_at,
            status=p.content_status,
            module_type=p.module_type,
            action_url=f"/user/projects/{p.id}",
            meta_summary=f"Durum: {p.content_status} · Asama: {p.current_stage or '—'}",
            is_overdue=is_overdue,
        ))
    return events


async def _collect_publish_events(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime,
    owner_user_id: Optional[str],
    channel_profile_id: Optional[str],
    platform: Optional[str],
    now: datetime,
) -> list[CalendarEvent]:
    """Collect PublishRecord scheduled/published events."""
    # Get records with scheduled_at or published_at in range
    q = select(PublishRecord).where(
        or_(
            and_(
                PublishRecord.scheduled_at.isnot(None),
                PublishRecord.scheduled_at >= start_date,
                PublishRecord.scheduled_at <= end_date,
            ),
            and_(
                PublishRecord.published_at.isnot(None),
                PublishRecord.published_at >= start_date,
                PublishRecord.published_at <= end_date,
            ),
        )
    )
    if platform:
        q = q.where(PublishRecord.platform == platform)
    q = q.limit(200)

    result = await db.execute(q)
    records = result.scalars().all()

    events = []
    for r in records:
        # Use scheduled_at if available, otherwise published_at, otherwise created_at
        start = r.scheduled_at or r.published_at or r.created_at
        is_overdue = (
            r.scheduled_at is not None
            and _safe_lt(r.scheduled_at, now)
            and r.status in ("scheduled", "approved")
        )
        title_prefix = "Yayin" if r.status == "published" else "Planli Yayin"
        events.append(CalendarEvent(
            id=f"pub-{r.id}",
            event_type="publish_record",
            title=f"{title_prefix}: {r.content_ref_type}",
            channel_profile_id=None,  # PublishRecord doesn't have direct channel FK
            owner_user_id=None,
            related_project_id=getattr(r, "content_project_id", None),
            related_publish_record_id=r.id,
            start_at=start,
            end_at=r.published_at if r.scheduled_at else None,
            status=r.status,
            platform=r.platform,
            module_type=r.content_ref_type,
            action_url=f"/admin/publish/{r.id}",
            meta_summary=f"Durum: {r.status} · Platform: {r.platform}",
            is_overdue=is_overdue,
        ))
    return events


async def _collect_post_events(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime,
    owner_user_id: Optional[str],
    channel_profile_id: Optional[str],
    platform: Optional[str],
    now: datetime,
) -> list[CalendarEvent]:
    """Collect PlatformPost scheduled/posted events."""
    q = select(PlatformPost).where(
        or_(
            and_(
                PlatformPost.scheduled_for.isnot(None),
                PlatformPost.scheduled_for >= start_date,
                PlatformPost.scheduled_for <= end_date,
            ),
            and_(
                PlatformPost.posted_at.isnot(None),
                PlatformPost.posted_at >= start_date,
                PlatformPost.posted_at <= end_date,
            ),
        )
    )
    if channel_profile_id:
        q = q.where(PlatformPost.channel_profile_id == channel_profile_id)
    if platform:
        q = q.where(PlatformPost.platform == platform)
    q = q.limit(200)

    result = await db.execute(q)
    posts = result.scalars().all()

    events = []
    for p in posts:
        start = p.scheduled_for or p.posted_at or p.created_at
        is_overdue = (
            p.scheduled_for is not None
            and _safe_lt(p.scheduled_for, now)
            and p.status in ("draft", "queued")
        )
        events.append(CalendarEvent(
            id=f"post-{p.id}",
            event_type="platform_post",
            title=f"Post: {p.post_type or 'community'}",
            channel_profile_id=p.channel_profile_id,
            owner_user_id=None,
            related_project_id=getattr(p, "content_project_id", None),
            related_post_id=p.id,
            start_at=start,
            end_at=p.posted_at if p.scheduled_for else None,
            status=p.status,
            platform=p.platform,
            action_url=f"/user/posts",
            meta_summary=f"Durum: {p.status} · Tip: {p.post_type}",
            is_overdue=is_overdue,
        ))
    return events
