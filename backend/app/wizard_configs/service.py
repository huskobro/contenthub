"""
Wizard Configuration service layer — M32.

CRUD + wizard type lookup. Follows visibility/service.py pattern.
Audit log entegrasyonu dahil.
"""

import json
import logging
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import WizardConfig
from app.audit.service import write_audit_log
from app.wizard_configs.schemas import (
    WizardConfigCreate,
    WizardConfigUpdate,
    WizardStepConfig,
)

logger = logging.getLogger(__name__)


async def list_configs(
    db: AsyncSession,
    module_scope: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> List[WizardConfig]:
    stmt = select(WizardConfig).order_by(WizardConfig.wizard_type)
    if module_scope is not None:
        stmt = stmt.where(WizardConfig.module_scope == module_scope)
    if status_filter is not None:
        stmt = stmt.where(WizardConfig.status == status_filter)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_config(db: AsyncSession, config_id: str) -> WizardConfig:
    result = await db.execute(
        select(WizardConfig).where(WizardConfig.id == config_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"WizardConfig '{config_id}' not found.",
        )
    return row


async def get_by_wizard_type(db: AsyncSession, wizard_type: str) -> Optional[WizardConfig]:
    """Wizard tipine gore config doner. Yoksa None."""
    result = await db.execute(
        select(WizardConfig).where(
            WizardConfig.wizard_type == wizard_type,
            WizardConfig.status == "active",
        )
    )
    return result.scalar_one_or_none()


def _serialize_steps(steps: list[WizardStepConfig]) -> str:
    """Steps listesini JSON string'e cevirir."""
    return json.dumps([s.model_dump() for s in steps], ensure_ascii=False)


async def create_config(db: AsyncSession, payload: WizardConfigCreate) -> WizardConfig:
    # Unique wizard_type check
    existing = await get_by_wizard_type(db, payload.wizard_type)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"WizardConfig for wizard_type='{payload.wizard_type}' already exists.",
        )

    row = WizardConfig(
        wizard_type=payload.wizard_type,
        display_name=payload.display_name,
        enabled=payload.enabled,
        steps_config_json=_serialize_steps(payload.steps_config),
        field_defaults_json=json.dumps(payload.field_defaults or {}, ensure_ascii=False),
        module_scope=payload.module_scope,
        status=payload.status,
        notes=payload.notes,
        version=1,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db,
        action="wizard_config.create",
        entity_type="wizard_config",
        entity_id=row.id,
        details={"wizard_type": row.wizard_type},
    )
    return row


async def update_config(
    db: AsyncSession,
    config_id: str,
    payload: WizardConfigUpdate,
) -> WizardConfig:
    row = await get_config(db, config_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return row

    # Handle steps_config serialization
    if "steps_config" in changes and changes["steps_config"] is not None:
        row.steps_config_json = _serialize_steps(payload.steps_config)
        del changes["steps_config"]

    if "field_defaults" in changes:
        row.field_defaults_json = json.dumps(changes.pop("field_defaults") or {}, ensure_ascii=False)

    for field, value in changes.items():
        setattr(row, field, value)

    row.version += 1
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db,
        action="wizard_config.update",
        entity_type="wizard_config",
        entity_id=row.id,
        details={"changed_fields": list(payload.model_dump(exclude_unset=True).keys()), "version": row.version},
    )
    return row


async def delete_config(db: AsyncSession, config_id: str) -> WizardConfig:
    """Soft-delete: status -> inactive."""
    row = await get_config(db, config_id)
    if row.status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"WizardConfig '{config_id}' is already inactive.",
        )
    row.status = "inactive"
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db,
        action="wizard_config.delete",
        entity_type="wizard_config",
        entity_id=row.id,
        details={"wizard_type": row.wizard_type, "soft_delete": True},
    )
    logger.info("WizardConfig soft-deleted: %s (type=%s)", config_id, row.wizard_type)
    return row
