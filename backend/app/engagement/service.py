"""
Engagement Task service — Faz 2 + Phase Final F2 ownership guard.

Business logic for engagement task CRUD.

Ownership:
  - `list_engagement_tasks` accepts an optional `caller_ctx`; when set, the
    query is scoped via `apply_user_scope(EngagementTask, owner_field="user_id")`
    which transparently no-ops for admin.
  - `get_engagement_task` / `update_engagement_task` remain thin; router enforces
    per-row ownership (more expressive 404 vs 403 separation lives there).
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, apply_user_scope
from app.db.models import EngagementTask
from app.engagement.schemas import EngagementTaskCreate, EngagementTaskUpdate

logger = logging.getLogger(__name__)


async def list_engagement_tasks(
    db: AsyncSession,
    *,
    caller_ctx: Optional[UserContext] = None,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[EngagementTask]:
    q = select(EngagementTask).order_by(EngagementTask.created_at.desc())

    # Query-level defense-in-depth: non-admin caller'in asla baska bir
    # kullanicinin tasklarini gormemesi icin ikinci katman.
    if caller_ctx is not None:
        q = apply_user_scope(q, EngagementTask, user_context=caller_ctx)

    if user_id:
        q = q.where(EngagementTask.user_id == user_id)
    if channel_profile_id:
        q = q.where(EngagementTask.channel_profile_id == channel_profile_id)
    if type:
        q = q.where(EngagementTask.type == type)
    if status:
        q = q.where(EngagementTask.status == status)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_engagement_task(
    db: AsyncSession, task_id: str
) -> Optional[EngagementTask]:
    return await db.get(EngagementTask, task_id)


async def create_engagement_task(
    db: AsyncSession, payload: EngagementTaskCreate
) -> EngagementTask:
    task = EngagementTask(
        user_id=payload.user_id,
        channel_profile_id=payload.channel_profile_id,
        platform_connection_id=payload.platform_connection_id,
        content_project_id=payload.content_project_id,
        type=payload.type,
        target_object_type=payload.target_object_type,
        target_object_id=payload.target_object_id,
        payload=payload.payload,
        ai_suggestion=payload.ai_suggestion,
        final_user_input=payload.final_user_input,
        status=payload.status,
        scheduled_for=payload.scheduled_for,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    logger.info("EngagementTask created: id=%s type=%s", task.id, task.type)
    return task


async def update_engagement_task(
    db: AsyncSession, task_id: str, payload: EngagementTaskUpdate
) -> Optional[EngagementTask]:
    task = await db.get(EngagementTask, task_id)
    if not task:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task
