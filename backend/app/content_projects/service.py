"""
Content Project service — Faz 2.

Business logic for content project CRUD.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ContentProject
from app.content_projects.schemas import ContentProjectCreate, ContentProjectUpdate

logger = logging.getLogger(__name__)


async def list_content_projects(
    db: AsyncSession,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    module_type: Optional[str] = None,
    content_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[ContentProject]:
    q = select(ContentProject).order_by(ContentProject.created_at.desc())
    if user_id:
        q = q.where(ContentProject.user_id == user_id)
    if channel_profile_id:
        q = q.where(ContentProject.channel_profile_id == channel_profile_id)
    if module_type:
        q = q.where(ContentProject.module_type == module_type)
    if content_status:
        q = q.where(ContentProject.content_status == content_status)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_content_project(
    db: AsyncSession, project_id: str
) -> Optional[ContentProject]:
    return await db.get(ContentProject, project_id)


async def create_content_project(
    db: AsyncSession, payload: ContentProjectCreate
) -> ContentProject:
    project = ContentProject(
        user_id=payload.user_id,
        channel_profile_id=payload.channel_profile_id,
        module_type=payload.module_type,
        title=payload.title,
        description=payload.description,
        current_stage=payload.current_stage,
        content_status=payload.content_status,
        review_status=payload.review_status,
        publish_status=payload.publish_status,
        primary_platform=payload.primary_platform,
        origin_type=payload.origin_type,
        priority=payload.priority,
        deadline_at=payload.deadline_at,
        active_job_id=payload.active_job_id,
        latest_output_ref=payload.latest_output_ref,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    logger.info("ContentProject created: id=%s title=%s", project.id, project.title)
    return project


async def update_content_project(
    db: AsyncSession, project_id: str, payload: ContentProjectUpdate
) -> Optional[ContentProject]:
    project = await db.get(ContentProject, project_id)
    if not project:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


async def delete_content_project(
    db: AsyncSession, project_id: str
) -> Optional[ContentProject]:
    """Soft delete — set content_status='archived'."""
    project = await db.get(ContentProject, project_id)
    if not project:
        return None
    project.content_status = "archived"
    await db.commit()
    await db.refresh(project)
    return project
