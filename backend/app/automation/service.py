"""
Automation Policy service — Faz 2.

Business logic for automation policy CRUD.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AutomationPolicy
from app.automation.schemas import AutomationPolicyCreate, AutomationPolicyUpdate

logger = logging.getLogger(__name__)


async def list_automation_policies(
    db: AsyncSession,
    channel_profile_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[AutomationPolicy]:
    q = select(AutomationPolicy).order_by(AutomationPolicy.created_at.desc())
    if channel_profile_id:
        q = q.where(AutomationPolicy.channel_profile_id == channel_profile_id)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_automation_policy(
    db: AsyncSession, policy_id: str
) -> Optional[AutomationPolicy]:
    return await db.get(AutomationPolicy, policy_id)


async def create_automation_policy(
    db: AsyncSession, payload: AutomationPolicyCreate
) -> AutomationPolicy:
    policy = AutomationPolicy(
        channel_profile_id=payload.channel_profile_id,
        automation_level=payload.automation_level,
        cp_source_scan=payload.cp_source_scan,
        cp_draft_generation=payload.cp_draft_generation,
        cp_render=payload.cp_render,
        cp_publish=payload.cp_publish,
        cp_post_publish=payload.cp_post_publish,
        publish_windows=payload.publish_windows,
        max_daily_posts=payload.max_daily_posts,
        platform_specific_rules=payload.platform_specific_rules,
        status=payload.status,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(policy, field, value)
    await db.commit()
    await db.refresh(policy)
    return policy
