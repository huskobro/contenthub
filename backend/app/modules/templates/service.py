from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Template
from .schemas import TemplateCreate, TemplateUpdate


async def list_templates(
    db: AsyncSession,
    template_type: Optional[str] = None,
    owner_scope: Optional[str] = None,
    module_scope: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Template]:
    stmt = select(Template).order_by(Template.created_at.desc())
    if template_type is not None:
        stmt = stmt.where(Template.template_type == template_type)
    if owner_scope is not None:
        stmt = stmt.where(Template.owner_scope == owner_scope)
    if module_scope is not None:
        stmt = stmt.where(Template.module_scope == module_scope)
    if status is not None:
        stmt = stmt.where(Template.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_template(db: AsyncSession, template_id: str) -> Optional[Template]:
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    return result.scalar_one_or_none()


async def create_template(db: AsyncSession, payload: TemplateCreate) -> Template:
    template = Template(
        name=payload.name,
        template_type=payload.template_type,
        owner_scope=payload.owner_scope,
        module_scope=payload.module_scope,
        description=payload.description,
        style_profile_json=payload.style_profile_json,
        content_rules_json=payload.content_rules_json,
        publish_profile_json=payload.publish_profile_json,
        status=payload.status or "draft",
        version=payload.version if payload.version is not None else 1,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


async def update_template(
    db: AsyncSession, template_id: str, payload: TemplateUpdate
) -> Optional[Template]:
    template = await get_template(db, template_id)
    if template is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(template, field, value)
    await db.commit()
    await db.refresh(template)
    return template
