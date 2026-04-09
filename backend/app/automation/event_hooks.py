"""
Automation Event Hooks — Faz 15.

Lightweight event-driven inbox population + policy bridge.

Pattern:
  emit_operation_event(db, event_type, ...) → creates inbox item if appropriate.

Rules:
  - Duplicate guard: won't create a new inbox item if open/acknowledged one exists
    for the same (entity_type, entity_id, item_type) combination.
  - Policy bridge: when a channel_profile_id is available, evaluates the relevant
    checkpoint to decide whether an inbox item is warranted.
  - policy_decision != execution_result: this module only creates inbox items,
    it never executes actual automation.
"""

import logging
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import OperationsInboxItem, AutomationPolicy

logger = logging.getLogger(__name__)


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
