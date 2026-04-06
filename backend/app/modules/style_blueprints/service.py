from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StyleBlueprint
from .schemas import StyleBlueprintCreate, StyleBlueprintUpdate


async def list_style_blueprints(
    db: AsyncSession,
    module_scope: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
) -> List[StyleBlueprint]:
    q = select(StyleBlueprint).order_by(StyleBlueprint.created_at.desc())
    if not include_test_data:
        q = q.where(StyleBlueprint.is_test_data == False)  # noqa: E712
    if module_scope is not None:
        q = q.where(StyleBlueprint.module_scope == module_scope)
    if status is not None:
        q = q.where(StyleBlueprint.status == status)
    if search:
        pattern = f"%{search}%"
        q = q.where(StyleBlueprint.name.ilike(pattern))
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_style_blueprint(db: AsyncSession, blueprint_id: str) -> Optional[StyleBlueprint]:
    result = await db.execute(
        select(StyleBlueprint).where(StyleBlueprint.id == blueprint_id)
    )
    return result.scalar_one_or_none()


async def create_style_blueprint(
    db: AsyncSession, payload: StyleBlueprintCreate
) -> StyleBlueprint:
    blueprint = StyleBlueprint(
        name=payload.name,
        module_scope=payload.module_scope,
        status=payload.status or "draft",
        version=payload.version if payload.version is not None else 1,
        visual_rules_json=payload.visual_rules_json,
        motion_rules_json=payload.motion_rules_json,
        layout_rules_json=payload.layout_rules_json,
        subtitle_rules_json=payload.subtitle_rules_json,
        thumbnail_rules_json=payload.thumbnail_rules_json,
        preview_strategy_json=payload.preview_strategy_json,
        notes=payload.notes,
    )
    db.add(blueprint)
    await db.commit()
    await db.refresh(blueprint)
    return blueprint


async def update_style_blueprint(
    db: AsyncSession, blueprint_id: str, payload: StyleBlueprintUpdate
) -> Optional[StyleBlueprint]:
    blueprint = await get_style_blueprint(db, blueprint_id)
    if blueprint is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(blueprint, field, value)
    await db.commit()
    await db.refresh(blueprint)
    return blueprint
