"""
Automation Event Hooks — Faz 15 + Faz 16 notification bridge.

Lightweight event-driven inbox population + policy bridge + notification emission.

Pattern:
  emit_operation_event(db, event_type, ...) → creates inbox item if appropriate,
  then creates a matching notification if the event is notification-worthy.

Rules:
  - Duplicate guard: won't create a new inbox item if open/acknowledged one exists
    for the same (entity_type, entity_id, item_type) combination.
  - Policy bridge: when a channel_profile_id is available, evaluates the relevant
    checkpoint to decide whether an inbox item is warranted.
  - policy_decision != execution_result: this module only creates inbox items
    and notifications, it never executes actual automation.
  - Notification bridge: after inbox item creation, also creates a NotificationItem
    and publishes SSE event for real-time delivery.
"""

import logging
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import OperationsInboxItem, AutomationPolicy

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Notification severity mapping — item_type → (severity, scope_type)
# ---------------------------------------------------------------------------

_NOTIFICATION_MAP = {
    "publish_review": ("warning", "admin", "Yayin onay bekliyor"),
    "publish_failure": ("error", "admin", "Yayin basarisiz"),
    "render_failure": ("error", "user", "Is basarisiz"),
    "source_scan_error": ("warning", "admin", "Kaynak tarama hatasi"),
    "overdue_publish": ("warning", "admin", "Geciken yayin"),
    "overdue_post": ("warning", "admin", "Geciken post"),
    "policy_review_required": ("info", "admin", "Policy inceleme gerekli"),
}


async def emit_operation_event(
    db: AsyncSession,
    *,
    item_type: str,
    title: str,
    reason: Optional[str] = None,
    priority: str = "normal",
    channel_profile_id: Optional[str] = None,
    owner_user_id: Optional[str] = None,
    related_project_id: Optional[str] = None,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    action_url: Optional[str] = None,
    metadata_json: Optional[str] = None,
    dedupe: bool = True,
) -> Optional[OperationsInboxItem]:
    """
    Create an inbox item if appropriate.

    Duplicate guard: if dedupe=True (default), checks for existing
    open/acknowledged item with same (related_entity_type, related_entity_id, item_type).
    Returns None if duplicate found; returns the created item otherwise.
    """
    # --- Duplicate guard ---
    if dedupe and related_entity_type and related_entity_id:
        existing = await _find_open_duplicate(
            db, item_type, related_entity_type, related_entity_id,
        )
        if existing:
            logger.debug(
                "Duplicate inbox guard: item_type=%s entity=%s/%s — skipped (existing=%s)",
                item_type, related_entity_type, related_entity_id, existing.id,
            )
            return None

    item = OperationsInboxItem(
        item_type=item_type,
        channel_profile_id=channel_profile_id,
        owner_user_id=owner_user_id,
        related_project_id=related_project_id,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        title=title,
        reason=reason,
        priority=priority,
        action_url=action_url,
        metadata_json=metadata_json,
    )
    db.add(item)
    # Note: caller is responsible for commit (we piggyback on the caller's transaction)
    logger.info(
        "Inbox item created: type=%s entity=%s/%s title=%s",
        item_type, related_entity_type, related_entity_id, title[:60],
    )

    # --- Faz 16: Notification bridge ---
    # Flush inbox item first so FK reference is valid for notification
    await db.flush()
    await _emit_notification_for_inbox(
        db,
        inbox_item=item,
        item_type=item_type,
        title=title,
        reason=reason,
        priority=priority,
        owner_user_id=owner_user_id,
        channel_profile_id=channel_profile_id,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        action_url=action_url,
    )

    return item


async def _find_open_duplicate(
    db: AsyncSession,
    item_type: str,
    related_entity_type: str,
    related_entity_id: str,
) -> Optional[OperationsInboxItem]:
    """Check if an open/acknowledged inbox item already exists for this entity+type."""
    q = select(OperationsInboxItem).where(
        and_(
            OperationsInboxItem.item_type == item_type,
            OperationsInboxItem.related_entity_type == related_entity_type,
            OperationsInboxItem.related_entity_id == related_entity_id,
            OperationsInboxItem.status.in_(["open", "acknowledged"]),
        )
    ).limit(1)
    result = await db.execute(q)
    return result.scalar_one_or_none()


async def evaluate_and_emit(
    db: AsyncSession,
    *,
    channel_profile_id: str,
    checkpoint: str,
    item_type: str,
    title: str,
    reason: Optional[str] = None,
    priority: str = "normal",
    owner_user_id: Optional[str] = None,
    related_project_id: Optional[str] = None,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    action_url: Optional[str] = None,
) -> Optional[OperationsInboxItem]:
    """
    Evaluate a policy checkpoint and emit an inbox item if manual_review is required.

    Returns the created inbox item, or None if:
    - No policy exists for the channel
    - Policy is disabled
    - Checkpoint mode is 'automatic' (no review needed)
    - Checkpoint mode is 'disabled' (manual trigger expected, no inbox)
    - Duplicate already exists
    """
    from app.automation.service import evaluate_checkpoint

    # Fetch policy for channel
    q = select(AutomationPolicy).where(
        AutomationPolicy.channel_profile_id == channel_profile_id
    )
    result = await db.execute(q)
    policy = result.scalar_one_or_none()

    decision = evaluate_checkpoint(policy, checkpoint)

    if not decision.requires_review:
        logger.debug(
            "Policy bridge: checkpoint=%s mode=%s — no review needed",
            checkpoint, decision.mode,
        )
        return None

    # manual_review → create inbox item
    return await emit_operation_event(
        db,
        item_type=item_type,
        title=title,
        reason=reason or decision.reason,
        priority=priority,
        channel_profile_id=channel_profile_id,
        owner_user_id=owner_user_id,
        related_project_id=related_project_id,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        action_url=action_url,
    )


# ---------------------------------------------------------------------------
# Faz 16: Notification bridge
# ---------------------------------------------------------------------------

_PRIORITY_TO_SEVERITY = {
    "urgent": "error",
    "high": "error",
    "normal": "warning",
    "low": "info",
}


async def _emit_notification_for_inbox(
    db: AsyncSession,
    *,
    inbox_item: OperationsInboxItem,
    item_type: str,
    title: str,
    reason: Optional[str] = None,
    priority: str = "normal",
    owner_user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    action_url: Optional[str] = None,
) -> None:
    """
    Create a notification for an inbox item and publish SSE event.

    Not every inbox item creates a notification. Only types in _NOTIFICATION_MAP
    produce notifications. This prevents notification spam.
    """
    from app.notifications.service import create_notification
    from app.sse.bus import event_bus

    mapping = _NOTIFICATION_MAP.get(item_type)
    if not mapping:
        return  # Not notification-worthy

    severity, scope_type, _label = mapping

    # Override severity from priority if more severe
    priority_severity = _PRIORITY_TO_SEVERITY.get(priority, "info")
    if _severity_rank(priority_severity) > _severity_rank(severity):
        severity = priority_severity

    notif = await create_notification(
        db,
        notification_type=item_type,
        title=title,
        body=reason,
        severity=severity,
        scope_type=scope_type,
        owner_user_id=owner_user_id,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        related_inbox_item_id=inbox_item.id,
        related_channel_profile_id=channel_profile_id,
        action_url=action_url,
    )

    if notif:
        # SSE push for real-time delivery
        event_bus.publish("notification:created", {
            "id": notif.id,
            "notification_type": notif.notification_type,
            "title": notif.title,
            "body": notif.body,
            "severity": notif.severity,
            "scope_type": notif.scope_type,
            "owner_user_id": notif.owner_user_id,
            "action_url": notif.action_url,
            "related_inbox_item_id": notif.related_inbox_item_id,
        })


def _severity_rank(s: str) -> int:
    return {"info": 0, "success": 0, "warning": 1, "error": 2}.get(s, 0)
