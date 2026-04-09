"""
Automation Policy + Operations Inbox service — Faz 13.

Business logic for:
- AutomationPolicy CRUD
- Checkpoint evaluation (policy decision helper)
- OperationsInboxItem CRUD + aggregation
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AutomationPolicy, OperationsInboxItem, ChannelProfile
from app.automation.schemas import (
    AutomationPolicyCreate,
    AutomationPolicyUpdate,
    CheckpointDecision,
    InboxItemCreate,
    InboxItemUpdate,
    CHECKPOINT_MODES,
)

logger = logging.getLogger(__name__)

CHECKPOINT_FIELDS = [
    "source_scan_mode",
    "draft_generation_mode",
    "render_mode",
    "publish_mode",
    "post_publish_mode",
]


# ---------------------------------------------------------------------------
# AutomationPolicy CRUD
# ---------------------------------------------------------------------------

async def list_automation_policies(
    db: AsyncSession,
    channel_profile_id: Optional[str] = None,
    owner_user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[AutomationPolicy]:
    q = select(AutomationPolicy).order_by(AutomationPolicy.created_at.desc())
    if channel_profile_id:
        q = q.where(AutomationPolicy.channel_profile_id == channel_profile_id)
    if owner_user_id:
        q = q.where(AutomationPolicy.owner_user_id == owner_user_id)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_automation_policy(
    db: AsyncSession, policy_id: str
) -> Optional[AutomationPolicy]:
    return await db.get(AutomationPolicy, policy_id)


async def get_policy_for_channel(
    db: AsyncSession, channel_profile_id: str
) -> Optional[AutomationPolicy]:
    """Get the automation policy for a specific channel profile."""
    q = select(AutomationPolicy).where(
        AutomationPolicy.channel_profile_id == channel_profile_id
    )
    result = await db.execute(q)
    return result.scalar_one_or_none()


async def create_automation_policy(
    db: AsyncSession, payload: AutomationPolicyCreate
) -> AutomationPolicy:
    # Validate checkpoint modes
    for field in CHECKPOINT_FIELDS:
        val = getattr(payload, field, "disabled")
        if val not in CHECKPOINT_MODES:
            raise ValueError(f"Gecersiz mode '{val}' for {field}")

    policy = AutomationPolicy(
        channel_profile_id=payload.channel_profile_id,
        owner_user_id=payload.owner_user_id,
        name=payload.name,
        is_enabled=payload.is_enabled,
        source_scan_mode=payload.source_scan_mode,
        draft_generation_mode=payload.draft_generation_mode,
        render_mode=payload.render_mode,
        publish_mode=payload.publish_mode,
        post_publish_mode=payload.post_publish_mode,
        max_daily_posts=payload.max_daily_posts,
        publish_windows_json=payload.publish_windows_json,
        platform_rules_json=payload.platform_rules_json,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)

    # Link to channel profile
    channel = await db.get(ChannelProfile, payload.channel_profile_id)
    if channel:
        channel.automation_policy_id = policy.id
        await db.commit()

    logger.info(
        "AutomationPolicy created: id=%s channel=%s",
        policy.id, policy.channel_profile_id,
    )
    return policy


async def update_automation_policy(
    db: AsyncSession, policy_id: str, payload: AutomationPolicyUpdate
) -> Optional[AutomationPolicy]:
    policy = await db.get(AutomationPolicy, policy_id)
    if not policy:
        return None

    updates = payload.model_dump(exclude_unset=True)
    # Validate any checkpoint mode updates
    for field in CHECKPOINT_FIELDS:
        if field in updates and updates[field] not in CHECKPOINT_MODES:
            raise ValueError(f"Gecersiz mode '{updates[field]}' for {field}")

    for field, value in updates.items():
        setattr(policy, field, value)
    await db.commit()
    await db.refresh(policy)
    return policy


# ---------------------------------------------------------------------------
# Checkpoint Evaluation
# ---------------------------------------------------------------------------

def evaluate_checkpoint(
    policy: Optional[AutomationPolicy],
    checkpoint: str,
) -> CheckpointDecision:
    """
    Evaluate a single checkpoint against a policy.

    Returns a decision object — does NOT execute anything.
    policy_decision != execution_result
    """
    field_name = f"{checkpoint}_mode"

    if policy is None or not policy.is_enabled:
        return CheckpointDecision(
            checkpoint=checkpoint,
            mode="disabled",
            should_proceed=False,
            requires_review=False,
            reason="Politika tanimli degil veya devre disi",
        )

    mode = getattr(policy, field_name, "disabled")

    if mode == "automatic":
        return CheckpointDecision(
            checkpoint=checkpoint,
            mode="automatic",
            should_proceed=True,
            requires_review=False,
            reason="Otomatik mod — islem devam edebilir",
        )
    elif mode == "manual_review":
        return CheckpointDecision(
            checkpoint=checkpoint,
            mode="manual_review",
            should_proceed=False,
            requires_review=True,
            reason="Manuel onay gerekli — Operations Inbox'e dusecek",
        )
    else:  # disabled
        return CheckpointDecision(
            checkpoint=checkpoint,
            mode="disabled",
            should_proceed=False,
            requires_review=False,
            reason="Checkpoint devre disi — elle tetiklenmeli",
        )


def evaluate_all_checkpoints(
    policy: Optional[AutomationPolicy],
) -> list[CheckpointDecision]:
    """Evaluate all 5 checkpoints for a policy."""
    checkpoints = ["source_scan", "draft_generation", "render", "publish", "post_publish"]
    return [evaluate_checkpoint(policy, cp) for cp in checkpoints]


# ---------------------------------------------------------------------------
# Operations Inbox CRUD
# ---------------------------------------------------------------------------

async def list_inbox_items(
    db: AsyncSession,
    owner_user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    status: Optional[str] = None,
    item_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[OperationsInboxItem]:
    q = select(OperationsInboxItem).order_by(OperationsInboxItem.created_at.desc())
    if owner_user_id:
        q = q.where(OperationsInboxItem.owner_user_id == owner_user_id)
    if channel_profile_id:
        q = q.where(OperationsInboxItem.channel_profile_id == channel_profile_id)
    if status:
        q = q.where(OperationsInboxItem.status == status)
    if item_type:
        q = q.where(OperationsInboxItem.item_type == item_type)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_inbox_item(
    db: AsyncSession, item_id: str
) -> Optional[OperationsInboxItem]:
    return await db.get(OperationsInboxItem, item_id)


async def create_inbox_item(
    db: AsyncSession, payload: InboxItemCreate
) -> OperationsInboxItem:
    item = OperationsInboxItem(
        item_type=payload.item_type,
        channel_profile_id=payload.channel_profile_id,
        owner_user_id=payload.owner_user_id,
        related_project_id=payload.related_project_id,
        related_entity_type=payload.related_entity_type,
        related_entity_id=payload.related_entity_id,
        title=payload.title,
        reason=payload.reason,
        priority=payload.priority,
        action_url=payload.action_url,
        metadata_json=payload.metadata_json,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_inbox_item(
    db: AsyncSession, item_id: str, payload: InboxItemUpdate
) -> Optional[OperationsInboxItem]:
    item = await db.get(OperationsInboxItem, item_id)
    if not item:
        return None
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(item, field, value)
    # Auto-set resolved_at when status becomes resolved
    if updates.get("status") == "resolved" and item.resolved_at is None:
        item.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return item


async def count_open_inbox_items(
    db: AsyncSession,
    owner_user_id: Optional[str] = None,
) -> int:
    """Count open inbox items — useful for badge/notification."""
    q = select(func.count(OperationsInboxItem.id)).where(
        OperationsInboxItem.status == "open"
    )
    if owner_user_id:
        q = q.where(OperationsInboxItem.owner_user_id == owner_user_id)
    result = await db.execute(q)
    return result.scalar() or 0
