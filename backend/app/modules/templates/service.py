from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Template, TemplateStyleLink
from .schemas import TemplateCreate, TemplateResponse, TemplateUpdate


async def list_templates(
    db: AsyncSession,
    template_type: Optional[str] = None,
    owner_scope: Optional[str] = None,
    module_scope: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
) -> List[Template]:
    stmt = select(Template).order_by(Template.created_at.desc())
    if not include_test_data:
        stmt = stmt.where(Template.is_test_data == False)  # noqa: E712
    if template_type is not None:
        stmt = stmt.where(Template.template_type == template_type)
    if owner_scope is not None:
        stmt = stmt.where(Template.owner_scope == owner_scope)
    if module_scope is not None:
        stmt = stmt.where(Template.module_scope == module_scope)
    if status is not None:
        stmt = stmt.where(Template.status == status)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Template.name.ilike(pattern))
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


async def list_templates_with_style_link_summary(
    db: AsyncSession,
    template_type: Optional[str] = None,
    owner_scope: Optional[str] = None,
    module_scope: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
) -> List[TemplateResponse]:
    templates = await list_templates(
        db,
        template_type=template_type,
        owner_scope=owner_scope,
        module_scope=module_scope,
        status=status,
        search=search,
        include_test_data=include_test_data,
    )
    result = []
    for t in templates:
        count_row = await db.execute(
            select(sqlfunc.count()).select_from(TemplateStyleLink).where(
                TemplateStyleLink.template_id == t.id
            )
        )
        style_link_count = count_row.scalar() or 0

        primary_row = await db.execute(
            select(TemplateStyleLink).where(
                TemplateStyleLink.template_id == t.id,
                TemplateStyleLink.status == "active",
            ).order_by(TemplateStyleLink.created_at.asc()).limit(1)
        )
        primary_link = primary_row.scalar_one_or_none()
        primary_link_role = primary_link.link_role if primary_link else None

        result.append(
            TemplateResponse(
                id=t.id,
                name=t.name,
                template_type=t.template_type,
                owner_scope=t.owner_scope,
                module_scope=t.module_scope,
                description=t.description,
                style_profile_json=t.style_profile_json,
                content_rules_json=t.content_rules_json,
                publish_profile_json=t.publish_profile_json,
                status=t.status,
                version=t.version,
                created_at=t.created_at,
                updated_at=t.updated_at,
                style_link_count=style_link_count,
                primary_link_role=primary_link_role,
            )
        )
    return result
