from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TemplateStyleLink, Template, StyleBlueprint
from .schemas import TemplateStyleLinkCreate, TemplateStyleLinkUpdate


async def list_template_style_links(
    db: AsyncSession,
    template_id: Optional[str] = None,
    style_blueprint_id: Optional[str] = None,
    status: Optional[str] = None,
) -> List[TemplateStyleLink]:
    stmt = select(TemplateStyleLink).order_by(TemplateStyleLink.created_at.desc())
    if template_id is not None:
        stmt = stmt.where(TemplateStyleLink.template_id == template_id)
    if style_blueprint_id is not None:
        stmt = stmt.where(TemplateStyleLink.style_blueprint_id == style_blueprint_id)
    if status is not None:
        stmt = stmt.where(TemplateStyleLink.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_template_style_link(
    db: AsyncSession, link_id: str
) -> Optional[TemplateStyleLink]:
    result = await db.execute(
        select(TemplateStyleLink).where(TemplateStyleLink.id == link_id)
    )
    return result.scalar_one_or_none()


async def create_template_style_link(
    db: AsyncSession, payload: TemplateStyleLinkCreate
) -> TemplateStyleLink:
    template = await db.get(Template, payload.template_id)
    if template is None:
        raise ValueError(f"Template {payload.template_id} not found")

    blueprint = await db.get(StyleBlueprint, payload.style_blueprint_id)
    if blueprint is None:
        raise ValueError(f"StyleBlueprint {payload.style_blueprint_id} not found")

    link = TemplateStyleLink(
        template_id=payload.template_id,
        style_blueprint_id=payload.style_blueprint_id,
        link_role=payload.link_role,
        status=payload.status or "active",
        notes=payload.notes,
    )
    db.add(link)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise
    await db.refresh(link)
    return link


async def update_template_style_link(
    db: AsyncSession, link_id: str, payload: TemplateStyleLinkUpdate
) -> Optional[TemplateStyleLink]:
    link = await get_template_style_link(db, link_id)
    if link is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(link, field, value)
    await db.commit()
    await db.refresh(link)
    return link
