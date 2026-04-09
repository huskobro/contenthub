"""
Notification Center service — Faz 16.

Business logic for creating, querying, and managing notifications.
Separated from inbox: notification = dikkat cekme, inbox = action queue.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NotificationItem

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

async def create_notification(
    db: AsyncSession,
    *,
    notification_type: str,
    title: str,
    body: Optional[str] = None,
    severity: str = "info",
    scope_type: str = "user",
    owner_user_id: Optional[str] = None,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    related_inbox_item_id: Optional[str] = None,
    related_channel_profile_id: Optional[str] = None,
    action_url: Optional[str] = None,
    dedupe: bool = True,
) -> Optional[NotificationItem]:
    """
    Create a notification item.

    Duplicate guard: if dedupe=True, prevents creating duplicate unread notification
    for the same (notification_type, related_entity_type, related_entity_id).
    """
    if dedupe and related_entity_type and related_entity_id:
        existing = await _find_unread_duplicate(
            db, notification_type, related_entity_type, related_entity_id,
        )
        if existing:
            logger.debug(
                "Notification duplicate guard: type=%s entity=%s/%s — skipped",
                notification_type, related_entity_type, related_entity_id,
            )
            return None

    item = NotificationItem(
        notification_type=notification_type,
        title=title,
        body=body,
        severity=severity,
        scope_type=scope_type,
        status="unread",
        owner_user_id=owner_user_id,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        related_inbox_item_id=related_inbox_item_id,
        related_channel_profile_id=related_channel_profile_id,
        action_url=action_url,
    )
    db.add(item)
    # Caller commits (piggyback on caller transaction)
    logger.info(
        "Notification created: type=%s severity=%s title=%s",
        notification_type, severity, title[:60],
    )
    return item


async def _find_unread_duplicate(
    db: AsyncSession,
    notification_type: str,
    related_entity_type: str,
    related_entity_id: str,
) -> Optional[NotificationItem]:
    """Check if an unread notification already exists for this entity+type."""
    q = select(NotificationItem).where(
        and_(
            NotificationItem.notification_type == notification_type,
            NotificationItem.related_entity_type == related_entity_type,
            NotificationItem.related_entity_id == related_entity_id,
            NotificationItem.status == "unread",
        )
    ).limit(1)
    result = await db.execute(q)
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

async def list_notifications(
    db: AsyncSession,
    *,
    owner_user_id: Optional[str] = None,
    scope_type: Optional[str] = None,
    status: Optional[str] = None,
    notification_type: Optional[str] = None,
    severity: Optional[str] = None,
    related_channel_profile_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[NotificationItem]:
    """List notifications with optional filters, ordered by created_at DESC."""
    q = select(NotificationItem).order_by(desc(NotificationItem.created_at))

    if owner_user_id is not None:
        q = q.where(NotificationItem.owner_user_id == owner_user_id)
    if scope_type is not None:
        q = q.where(NotificationItem.scope_type == scope_type)
    if status is not None:
        q = q.where(NotificationItem.status == status)
    if notification_type is not None:
        q = q.where(NotificationItem.notification_type == notification_type)
    if severity is not None:
        q = q.where(NotificationItem.severity == severity)
    if related_channel_profile_id is not None:
        q = q.where(NotificationItem.related_channel_profile_id == related_channel_profile_id)

    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_notification(db: AsyncSession, notification_id: str) -> Optional[NotificationItem]:
    """Get a single notification by ID."""
    q = select(NotificationItem).where(NotificationItem.id == notification_id)
    result = await db.execute(q)
    return result.scalar_one_or_none()


async def count_notifications(
    db: AsyncSession,
    *,
    owner_user_id: Optional[str] = None,
    scope_type: Optional[str] = None,
) -> dict:
    """Return unread and total counts."""
    base = select(func.count(NotificationItem.id))
    if owner_user_id is not None:
        base = base.where(NotificationItem.owner_user_id == owner_user_id)
    if scope_type is not None:
        base = base.where(NotificationItem.scope_type == scope_type)

    total_result = await db.execute(base)
    total = total_result.scalar() or 0

    unread_q = base.where(NotificationItem.status == "unread")
    unread_result = await db.execute(unread_q)
    unread = unread_result.scalar() or 0

    return {"unread": unread, "total": total}


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

async def mark_read(db: AsyncSession, notification_id: str) -> Optional[NotificationItem]:
    """Mark notification as read."""
    item = await get_notification(db, notification_id)
    if not item:
        return None
    item.status = "read"
    item.read_at = datetime.now(timezone.utc)
    await db.flush()
    return item


async def mark_dismissed(db: AsyncSession, notification_id: str) -> Optional[NotificationItem]:
    """Mark notification as dismissed."""
    item = await get_notification(db, notification_id)
    if not item:
        return None
    item.status = "dismissed"
    item.dismissed_at = datetime.now(timezone.utc)
    await db.flush()
    return item


async def mark_all_read(
    db: AsyncSession,
    *,
    owner_user_id: Optional[str] = None,
    scope_type: Optional[str] = None,
) -> int:
    """Mark all unread notifications as read. Returns count of updated items."""
    q = select(NotificationItem).where(NotificationItem.status == "unread")
    if owner_user_id is not None:
        q = q.where(NotificationItem.owner_user_id == owner_user_id)
    if scope_type is not None:
        q = q.where(NotificationItem.scope_type == scope_type)

    result = await db.execute(q)
    items = list(result.scalars().all())
    now = datetime.now(timezone.utc)
    for item in items:
        item.status = "read"
        item.read_at = now
    await db.flush()
    return len(items)
