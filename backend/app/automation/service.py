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

from app.auth.ownership import (
    UserContext,
    apply_user_scope,
    ensure_owner_or_admin,
)
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
    caller_ctx: Optional[UserContext] = None,
) -> list[AutomationPolicy]:
    """
    Phase AN-1: ownership-enforced list.

    - Admin caller: tum politikalari gorur; opsiyonel owner_user_id/channel
      filtresi istege baglidir.
    - Non-admin caller: query-level `apply_user_scope` ile `owner_user_id ==
      caller.user_id` zorlanir; caller-provided `owner_user_id` parametresi
      **goz ardi edilir** (bir non-admin baskasinin owner_user_id'sini
      veremez; verse bile filtre caller'in kendi id'sine donusur).
    - Geriye-uyumluluk: `caller_ctx=None` ile cagri yapilirsa eski davranis
      korunur (ic servis/scheduler callerlari icin). Router bu parametreyi
      her zaman gecirir.
    """
    q = select(AutomationPolicy).order_by(AutomationPolicy.created_at.desc())
    if channel_profile_id:
        q = q.where(AutomationPolicy.channel_profile_id == channel_profile_id)

    if caller_ctx is not None:
        q = apply_user_scope(
            q, AutomationPolicy,
            user_context=caller_ctx,
            owner_field="owner_user_id",
        )
        # Admin caller: opsiyonel owner_user_id filtresini uygula.
        if caller_ctx.is_admin_role and owner_user_id:
            q = q.where(AutomationPolicy.owner_user_id == owner_user_id)
    else:
        # Legacy path — dahili scheduler/callerlar icin.
        if owner_user_id:
            q = q.where(AutomationPolicy.owner_user_id == owner_user_id)

    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_automation_policy(
    db: AsyncSession,
    policy_id: str,
    caller_ctx: Optional[UserContext] = None,
) -> Optional[AutomationPolicy]:
    """
    Phase AN-1: ownership gate.

    Var olan policy bulunursa caller'in sahibi (veya admin) oldugu dogrulanir.
    Sahip degilse `OwnershipError` (403) firlatilir — caller eger
    `not_found_on_missing` tercihine guvenecekse bunu kendisi ele almalidir.
    `caller_ctx=None` legacy path: enforce yok (dahili servis callerlari).
    """
    policy = await db.get(AutomationPolicy, policy_id)
    if policy is None:
        return None
    if caller_ctx is not None:
        ensure_owner_or_admin(
            caller_ctx, policy.owner_user_id,
            resource_label="Otomasyon politikasi",
        )
    return policy


async def get_policy_for_channel(
    db: AsyncSession,
    channel_profile_id: str,
    caller_ctx: Optional[UserContext] = None,
) -> Optional[AutomationPolicy]:
    """Get the automation policy for a specific channel profile.

    Phase AN-1: ownership-enforced; bulunan policy'nin sahibi caller degilse
    403 firlatilir (admin her zaman gecer).
    """
    q = select(AutomationPolicy).where(
        AutomationPolicy.channel_profile_id == channel_profile_id
    )
    result = await db.execute(q)
    policy = result.scalar_one_or_none()
    if policy is None:
        return None
    if caller_ctx is not None:
        ensure_owner_or_admin(
            caller_ctx, policy.owner_user_id,
            resource_label="Otomasyon politikasi",
        )
    return policy


async def create_automation_policy(
    db: AsyncSession,
    payload: AutomationPolicyCreate,
    caller_ctx: Optional[UserContext] = None,
) -> AutomationPolicy:
    """
    Phase AN-1: non-admin caller kendi adina olusturabilir; payload'daki
    `owner_user_id` non-admin icin gormezden gelinir ve caller'in id'sine
    sabitlenir. Admin caller istedigi `owner_user_id`'yi verebilir (veya
    bos birakip kendine assignlayabilir).
    """
    # Validate checkpoint modes
    for field in CHECKPOINT_FIELDS:
        val = getattr(payload, field, "disabled")
        if val not in CHECKPOINT_MODES:
            raise ValueError(f"Gecersiz mode '{val}' for {field}")

    owner_user_id = payload.owner_user_id
    if caller_ctx is not None and not caller_ctx.is_admin_role:
        # Non-admin: zorla kendi id'sine sabitle.
        owner_user_id = caller_ctx.user_id

    # Phase AL / P3.2: approver_user_id spoof kontrol.
    # Non-admin yalnizca kendi id'sini veya NULL atayabilir; admin serbest.
    approver_user_id = payload.approver_user_id
    if caller_ctx is not None and not caller_ctx.is_admin_role:
        if approver_user_id is not None and approver_user_id != caller_ctx.user_id:
            approver_user_id = caller_ctx.user_id

    policy = AutomationPolicy(
        channel_profile_id=payload.channel_profile_id,
        owner_user_id=owner_user_id,
        approver_user_id=approver_user_id,
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
        "AutomationPolicy created: id=%s channel=%s owner=%s",
        policy.id, policy.channel_profile_id, policy.owner_user_id,
    )
    return policy


async def update_automation_policy(
    db: AsyncSession,
    policy_id: str,
    payload: AutomationPolicyUpdate,
    caller_ctx: Optional[UserContext] = None,
) -> Optional[AutomationPolicy]:
    """Phase AN-1: update path ownership-enforced."""
    policy = await db.get(AutomationPolicy, policy_id)
    if not policy:
        return None

    if caller_ctx is not None:
        ensure_owner_or_admin(
            caller_ctx, policy.owner_user_id,
            resource_label="Otomasyon politikasi",
        )

    updates = payload.model_dump(exclude_unset=True)
    # Validate any checkpoint mode updates
    for field in CHECKPOINT_FIELDS:
        if field in updates and updates[field] not in CHECKPOINT_MODES:
            raise ValueError(f"Gecersiz mode '{updates[field]}' for {field}")

    # Phase AL / P3.2: approver spoof koruma. Non-admin yalniz kendi id'sini
    # veya NULL atayabilir; admin istedigini atayabilir.
    if "approver_user_id" in updates and caller_ctx is not None and not caller_ctx.is_admin_role:
        if updates["approver_user_id"] is not None and updates["approver_user_id"] != caller_ctx.user_id:
            updates["approver_user_id"] = caller_ctx.user_id

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
    caller_ctx: Optional[UserContext] = None,
) -> list[OperationsInboxItem]:
    """Phase AN-1: ownership-enforced list (bkz. list_automation_policies)."""
    q = select(OperationsInboxItem).order_by(OperationsInboxItem.created_at.desc())
    if channel_profile_id:
        q = q.where(OperationsInboxItem.channel_profile_id == channel_profile_id)
    if status:
        q = q.where(OperationsInboxItem.status == status)
    if item_type:
        q = q.where(OperationsInboxItem.item_type == item_type)

    if caller_ctx is not None:
        q = apply_user_scope(
            q, OperationsInboxItem,
            user_context=caller_ctx,
            owner_field="owner_user_id",
        )
        if caller_ctx.is_admin_role and owner_user_id:
            q = q.where(OperationsInboxItem.owner_user_id == owner_user_id)
    else:
        if owner_user_id:
            q = q.where(OperationsInboxItem.owner_user_id == owner_user_id)

    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_inbox_item(
    db: AsyncSession,
    item_id: str,
    caller_ctx: Optional[UserContext] = None,
) -> Optional[OperationsInboxItem]:
    """Phase AN-1: ownership gate."""
    item = await db.get(OperationsInboxItem, item_id)
    if item is None:
        return None
    if caller_ctx is not None:
        ensure_owner_or_admin(
            caller_ctx, item.owner_user_id,
            resource_label="Inbox ogesi",
        )
    return item


async def create_inbox_item(
    db: AsyncSession,
    payload: InboxItemCreate,
    caller_ctx: Optional[UserContext] = None,
) -> OperationsInboxItem:
    """
    Phase AN-1: non-admin caller kendi adina inbox ogesi acabilir; payload'in
    owner_user_id'si non-admin icin caller'in id'sine sabitlenir.
    """
    owner_user_id = payload.owner_user_id
    if caller_ctx is not None and not caller_ctx.is_admin_role:
        owner_user_id = caller_ctx.user_id

    item = OperationsInboxItem(
        item_type=payload.item_type,
        channel_profile_id=payload.channel_profile_id,
        owner_user_id=owner_user_id,
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
    db: AsyncSession,
    item_id: str,
    payload: InboxItemUpdate,
    caller_ctx: Optional[UserContext] = None,
) -> Optional[OperationsInboxItem]:
    """Phase AN-1: update path ownership-enforced."""
    item = await db.get(OperationsInboxItem, item_id)
    if not item:
        return None

    if caller_ctx is not None:
        ensure_owner_or_admin(
            caller_ctx, item.owner_user_id,
            resource_label="Inbox ogesi",
        )

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
    caller_ctx: Optional[UserContext] = None,
) -> int:
    """Count open inbox items — useful for badge/notification.

    Phase AN-1: non-admin caller sadece kendi acik kayitlarini sayar.
    """
    q = select(func.count(OperationsInboxItem.id)).where(
        OperationsInboxItem.status == "open"
    )

    if caller_ctx is not None:
        q = apply_user_scope(
            q, OperationsInboxItem,
            user_context=caller_ctx,
            owner_field="owner_user_id",
        )
        if caller_ctx.is_admin_role and owner_user_id:
            q = q.where(OperationsInboxItem.owner_user_id == owner_user_id)
    else:
        if owner_user_id:
            q = q.where(OperationsInboxItem.owner_user_id == owner_user_id)

    result = await db.execute(q)
    return result.scalar() or 0
