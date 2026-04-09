"""
Calendar aggregation service — Faz 14 + 14a.

Aggregates scheduling data from ContentProject, PublishRecord, PlatformPost
into unified CalendarEvent list.

Faz 14a: Added policy/inbox context, platform filter for projects,
inbox cross-reference, and channel context endpoint support.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ContentProject, PublishRecord, PlatformPost,
    OperationsInboxItem, AutomationPolicy, ChannelProfile,
)
from app.calendar.schemas import CalendarEvent, ChannelCalendarContext

logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_lt(dt_a: datetime, dt_b: datetime) -> bool:
    """Compare two datetimes safely even if one is naive and other is aware."""
    a = dt_a.replace(tzinfo=None) if dt_a.tzinfo else dt_a
    b = dt_b.replace(tzinfo=None) if dt_b.tzinfo else dt_b
    return a < b


def _parse_publish_windows(raw: Optional[str]) -> Optional[str]:
    """Parse publish_windows_json into human-readable Turkish summary."""
    if not raw:
        return None
    try:
        windows = json.loads(raw)
        if not isinstance(windows, list) or len(windows) == 0:
            return None
        parts = []
        for w in windows:
            days = w.get("days", "")
            start = w.get("start", "")
            end = w.get("end", "")
            if start and end:
                parts.append(f"{days} {start}-{end}" if days else f"{start}-{end}")
        return " | ".join(parts) if parts else raw
    except (json.JSONDecodeError, TypeError):
        return raw


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
                channel_profile_id, platform, now,
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

    # --- Enrich with inbox cross-references ---
    await _enrich_inbox_relations(db, events)

    # Sort by start_at
    events.sort(key=lambda e: e.start_at)
    return events


async def _collect_project_events(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime,
    owner_user_id: Optional[str],
    channel_profile_id: Optional[str],
    platform: Optional[str],
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
    # Faz 14a: platform filter via primary_platform
    if platform:
        q = q.where(ContentProject.primary_platform == platform)
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
            platform=p.primary_platform,
            primary_platform=p.primary_platform,
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
            channel_profile_id=None,
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
            action_url="/user/posts",
            meta_summary=f"Durum: {p.status} · Tip: {p.post_type}",
            is_overdue=is_overdue,
        ))
    return events


async def _enrich_inbox_relations(
    db: AsyncSession, events: list[CalendarEvent],
) -> None:
    """
    Cross-reference calendar events with OperationsInboxItem.

    Matches by related_entity_type + related_entity_id against event source IDs.
    Only matches open/acknowledged inbox items (resolved ones are ignored).
    """
    if not events:
        return

    # Build lookup: (entity_type, entity_id) -> event indices
    entity_map: dict[tuple[str, str], list[int]] = {}
    for idx, ev in enumerate(events):
        if ev.related_project_id:
            key = ("content_project", ev.related_project_id)
            entity_map.setdefault(key, []).append(idx)
        if ev.related_publish_record_id:
            key = ("publish_record", ev.related_publish_record_id)
            entity_map.setdefault(key, []).append(idx)
        if ev.related_post_id:
            key = ("platform_post", ev.related_post_id)
            entity_map.setdefault(key, []).append(idx)

    if not entity_map:
        return

    # Query open inbox items matching these entities
    entity_type_ids = list(entity_map.keys())
    conditions = []
    for etype, eid in entity_type_ids:
        conditions.append(
            and_(
                OperationsInboxItem.related_entity_type == etype,
                OperationsInboxItem.related_entity_id == eid,
            )
        )

    if not conditions:
        return

    q = (
        select(OperationsInboxItem)
        .where(
            OperationsInboxItem.status.in_(["open", "acknowledged"]),
            or_(*conditions),
        )
        .limit(500)
    )
    result = await db.execute(q)
    inbox_items = result.scalars().all()

    # Enrich events
    for item in inbox_items:
        key = (item.related_entity_type, item.related_entity_id)
        indices = entity_map.get(key, [])
        for idx in indices:
            events[idx].inbox_item_id = item.id
            events[idx].inbox_item_status = item.status


async def get_channel_calendar_context(
    db: AsyncSession,
    channel_profile_id: str,
) -> ChannelCalendarContext:
    """
    Get policy + inbox summary for a channel — used by calendar detail panel.

    Returns policy state, publish constraints, and open inbox count.
    """
    # Channel name
    channel = await db.get(ChannelProfile, channel_profile_id)
    channel_name = channel.profile_name if channel else None

    # Policy
    q = select(AutomationPolicy).where(
        AutomationPolicy.channel_profile_id == channel_profile_id
    )
    result = await db.execute(q)
    policy = result.scalar_one_or_none()

    # Open inbox count for this channel
    count_q = select(func.count(OperationsInboxItem.id)).where(
        OperationsInboxItem.channel_profile_id == channel_profile_id,
        OperationsInboxItem.status.in_(["open", "acknowledged"]),
    )
    count_result = await db.execute(count_q)
    open_count = count_result.scalar() or 0

    if not policy:
        return ChannelCalendarContext(
            channel_profile_id=channel_profile_id,
            channel_name=channel_name,
            open_inbox_count=open_count,
        )

    # Build checkpoint summary
    modes = {
        "source_scan": policy.source_scan_mode,
        "draft": policy.draft_generation_mode,
        "render": policy.render_mode,
        "publish": policy.publish_mode,
        "post_publish": policy.post_publish_mode,
    }
    auto_count = sum(1 for m in modes.values() if m == "automatic")
    review_count = sum(1 for m in modes.values() if m == "manual_review")
    disabled_count = sum(1 for m in modes.values() if m == "disabled")
    checkpoint_summary = f"{auto_count} otomatik · {review_count} onay · {disabled_count} devre disi"

    return ChannelCalendarContext(
        channel_profile_id=channel_profile_id,
        channel_name=channel_name,
        policy_id=policy.id,
        policy_enabled=policy.is_enabled,
        publish_mode=policy.publish_mode,
        max_daily_posts=policy.max_daily_posts,
        publish_windows_json=policy.publish_windows_json,
        publish_windows_display=_parse_publish_windows(policy.publish_windows_json),
        checkpoint_summary=checkpoint_summary,
        open_inbox_count=open_count,
    )
