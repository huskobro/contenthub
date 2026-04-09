"""
Overdue Notification Scheduler — Faz 16a.

Background async task that detects overdue scheduled publishes and posts,
then emits inbox items + notifications via event hooks.

Pattern follows existing schedulers (publish/scheduler.py, source_scans/scheduler.py).

Overdue criteria:
  - PublishRecord: status in ('scheduled', 'approved') AND scheduled_at < now
  - PlatformPost: status in ('draft', 'queued') AND scheduled_for < now

Safety:
  - Duplicate guard via emit_operation_event prevents spam
  - Batch limits prevent overload
  - Never raises — loop continues on error
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PublishRecord, PlatformPost

logger = logging.getLogger(__name__)

_DEFAULT_INTERVAL = 300  # 5 minutes


async def poll_overdue_notifications(
    db_session_factory,
    interval: float = _DEFAULT_INTERVAL,
) -> None:
    """
    Infinite loop that checks for overdue publishes/posts and emits notifications.

    Designed to run as an asyncio.Task.
    Catches all exceptions to prevent loop from dying.
    """
    logger.info("Overdue notification scheduler started (interval=%ss)", interval)
    while True:
        try:
            await asyncio.sleep(interval)
            count = await _check_overdue(db_session_factory)
            if count > 0:
                logger.info("Overdue scheduler emitted %d notification(s).", count)
        except asyncio.CancelledError:
            logger.info("Overdue notification scheduler cancelled.")
            break
        except Exception as exc:
            logger.warning("Overdue notification scheduler error: %s", exc)


async def _check_overdue(db_session_factory) -> int:
    """Check for overdue items and emit notifications. Returns count of emitted."""
    now = datetime.now(timezone.utc)
    emitted = 0

    async with db_session_factory() as db:
        emitted += await _check_overdue_publishes(db, now)
        emitted += await _check_overdue_posts(db, now)
        if emitted > 0:
            await db.commit()

    return emitted


async def _check_overdue_publishes(db: AsyncSession, now: datetime) -> int:
    """Detect overdue PublishRecords and emit notifications."""
    from app.automation.event_hooks import emit_operation_event

    stmt = (
        select(PublishRecord)
        .where(
            and_(
                PublishRecord.status.in_(["scheduled", "approved"]),
                PublishRecord.scheduled_at.is_not(None),
                PublishRecord.scheduled_at < now,
            )
        )
        .limit(20)
    )
    result = await db.execute(stmt)
    records = list(result.scalars().all())
    emitted = 0

    for r in records:
        try:
            item = await emit_operation_event(
                db,
                item_type="overdue_publish",
                title=f"Geciken yayin: {r.content_ref_type or 'bilinmeyen'}",
                reason=f"Planli yayin zamani ({_fmt_dt(r.scheduled_at)}) gecti, "
                       f"durum hala '{r.status}'.",
                priority="high",
                owner_user_id=getattr(r, "owner_user_id", None),
                related_entity_type="publish_record",
                related_entity_id=r.id,
                action_url=f"/admin/publish/{r.id}",
            )
            if item is not None:
                emitted += 1
        except Exception as exc:
            logger.warning(
                "Overdue scheduler: failed to emit for publish_record %s: %s",
                r.id, exc,
            )

    return emitted


async def _check_overdue_posts(db: AsyncSession, now: datetime) -> int:
    """Detect overdue PlatformPosts and emit notifications."""
    from app.automation.event_hooks import emit_operation_event

    stmt = (
        select(PlatformPost)
        .where(
            and_(
                PlatformPost.status.in_(["draft", "queued"]),
                PlatformPost.scheduled_for.is_not(None),
                PlatformPost.scheduled_for < now,
            )
        )
        .limit(20)
    )
    result = await db.execute(stmt)
    posts = list(result.scalars().all())
    emitted = 0

    for p in posts:
        try:
            item = await emit_operation_event(
                db,
                item_type="overdue_post",
                title=f"Geciken post: {p.post_type or 'bilinmeyen'}",
                reason=f"Planli post zamani ({_fmt_dt(p.scheduled_for)}) gecti, "
                       f"durum hala '{p.status}'.",
                priority="normal",
                channel_profile_id=getattr(p, "channel_profile_id", None),
                related_entity_type="platform_post",
                related_entity_id=p.id,
                action_url="/admin/posts",
            )
            if item is not None:
                emitted += 1
        except Exception as exc:
            logger.warning(
                "Overdue scheduler: failed to emit for platform_post %s: %s",
                p.id, exc,
            )

    return emitted


def _fmt_dt(dt: datetime) -> str:
    """Format datetime for human-readable Turkish notification text."""
    if dt is None:
        return "?"
    try:
        naive = dt.replace(tzinfo=None) if dt.tzinfo else dt
        return naive.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return str(dt)
