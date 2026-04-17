"""
Settings Registry service layer.

Business logic lives here; routers call these functions and pass
the AsyncSession in. No direct SQLAlchemy imports leak into routers.

Supported operations (M22-B complete):
  - list_settings    : all settings, optional group_name filter
  - get_setting      : single setting by id
  - create_setting   : insert new setting; raises 409 on duplicate key
  - update_setting   : partial update by id; raises 404 if missing
  - delete_setting   : soft-delete (status → deleted) with audit (M22-B)
  - bulk_update      : birden fazla ayarın admin_value_json'unu toplu güncelle (M22-B)

Settings + Visibility ilişkisi:
  Settings resolver ayar değerlerini çözümler (priority chain).
  Visibility resolver erişim kurallarını çözümler (target_key + context).
  İkisi bağımsız sorumluluklar; merge yerine composition kullanılır.
  Settings paneline erişim visibility guard ile kontrol edilir.
"""

import json
import logging
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Setting
from app.audit.service import write_audit_log
from app.settings.schemas import SettingCreate, SettingUpdate
from app.settings.validation import validate_setting_value, SettingValidationError

logger = logging.getLogger(__name__)


async def list_settings(
    db: AsyncSession,
    group_name: Optional[str] = None,
    visible_to_user_only: bool = False,
) -> List[Setting]:
    stmt = select(Setting).order_by(Setting.group_name, Setting.key)
    if group_name is not None:
        stmt = stmt.where(Setting.group_name == group_name)
    if visible_to_user_only:
        # Phase AM-4: only active rows — 'orphan' (key removed from registry)
        # and 'deleted' (admin soft-deleted) must never leak to users.
        stmt = stmt.where(
            Setting.visible_to_user == True,  # noqa: E712
            Setting.status == "active",
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_setting(db: AsyncSession, setting_id: str) -> Setting:
    result = await db.execute(select(Setting).where(Setting.id == setting_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{setting_id}' not found.",
        )
    return row


async def get_setting_by_key(db: AsyncSession, key: str) -> Optional[Setting]:
    """Anahtar ile ayar getir. Bulunamazsa None döner (404 atmaz)."""
    result = await db.execute(select(Setting).where(Setting.key == key))
    return result.scalar_one_or_none()


async def create_setting(db: AsyncSession, payload: SettingCreate) -> Setting:
    row = Setting(**payload.model_dump())
    db.add(row)
    try:
        await db.commit()
        await db.refresh(row)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A setting with key '{payload.key}' already exists.",
        )
    await write_audit_log(
        db, action="setting.create",
        entity_type="setting", entity_id=row.id,
        details={"key": row.key, "group": row.group_name},
    )
    return row


async def update_setting(
    db: AsyncSession,
    setting_id: str,
    payload: SettingUpdate,
) -> Setting:
    row = await get_setting(db, setting_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return row

    # Validate admin_value_json if it is being updated
    if "admin_value_json" in changes and changes["admin_value_json"] is not None:
        if row.validation_rules_json and row.validation_rules_json != "{}":
            try:
                validate_setting_value(
                    key=row.key,
                    value_json=changes["admin_value_json"],
                    rules_json=row.validation_rules_json,
                    setting_type=row.type or "string",
                )
            except SettingValidationError as exc:
                raise HTTPException(
                    status_code=status.HTTP_UNPROCESSABLE_ENTITY,
                    detail=exc.message,
                )

    old_version = row.version
    for field, value in changes.items():
        setattr(row, field, value)
    # Bump version on each update so callers can detect change
    row.version = row.version + 1
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db, action="setting.update",
        entity_type="setting", entity_id=row.id,
        details={
            "key": row.key,
            "changed_fields": list(changes.keys()),
            "old_version": old_version,
            "new_version": row.version,
        },
    )
    return row


async def delete_setting(db: AsyncSession, setting_id: str) -> Setting:
    """
    Soft-delete: status → deleted. Ayar silinmez, devre dışı bırakılır.
    Settings resolver 'deleted' status'lu ayarları atlar.
    Seed tarafından tekrar oluşturulmaz (key hâlâ DB'de).
    """
    row = await get_setting(db, setting_id)
    if row.status == "deleted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Setting '{setting_id}' is already deleted.",
        )
    old_status = row.status
    row.status = "deleted"
    row.version = row.version + 1
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db, action="setting.delete",
        entity_type="setting", entity_id=row.id,
        details={
            "key": row.key,
            "old_status": old_status,
            "soft_delete": True,
        },
    )
    logger.info("Setting soft-deleted: %s (key=%s)", setting_id, row.key)
    return row


async def restore_setting(db: AsyncSession, setting_id: str) -> Setting:
    """
    Soft-delete edilmiş ayarı geri yükle: status → active.
    Zaten active olan ayar 409 döner.
    M23-D: Operasyonel tamamlama — silme geri alınabilir olmalı.
    """
    row = await get_setting(db, setting_id)
    if row.status == "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Setting '{setting_id}' is already active.",
        )
    old_status = row.status
    row.status = "active"
    row.version = row.version + 1
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db, action="setting.restore",
        entity_type="setting", entity_id=row.id,
        details={"key": row.key, "old_status": old_status, "restored": True},
    )
    logger.info("Setting restored: %s (key=%s)", setting_id, row.key)
    return row


async def get_setting_history(db: AsyncSession, setting_id: str) -> list:
    """
    Bir ayarın audit geçmişini döner.
    M23-D: Change history — audit_logs tablosundan filtreleme.
    """
    from app.db.models import AuditLog
    await get_setting(db, setting_id)
    stmt = (
        select(AuditLog)
        .where(AuditLog.entity_type == "setting")
        .where(AuditLog.entity_id == setting_id)
        .order_by(AuditLog.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "action": r.action,
            "details": r.details_json,
            "created_at": str(r.created_at) if r.created_at else None,
        }
        for r in rows
    ]


async def bulk_update_admin_values(
    db: AsyncSession,
    updates: List[dict],
) -> List[Setting]:
    """
    Toplu admin_value güncelleme.
    updates: [{"key": "...", "value": ...}, ...]
    Her ayar için admin_value_json güncellenir ve version artar.
    """
    if not updates:
        return []

    results = []
    for item in updates:
        key = item.get("key")
        value = item.get("value")
        if not key:
            continue

        row = await get_setting_by_key(db, key)
        if row is None:
            logger.warning("Bulk update: key '%s' not found, skipping", key)
            continue

        # Validate before applying
        value_json = json.dumps(value)
        if row.validation_rules_json and row.validation_rules_json != "{}":
            try:
                validate_setting_value(
                    key=row.key,
                    value_json=value_json,
                    rules_json=row.validation_rules_json,
                    setting_type=row.type or "string",
                )
            except SettingValidationError as exc:
                raise HTTPException(
                    status_code=status.HTTP_UNPROCESSABLE_ENTITY,
                    detail=exc.message,
                )

        row.admin_value_json = value_json
        row.version = row.version + 1
        results.append(row)

    if results:
        await db.commit()
        for row in results:
            await db.refresh(row)
        await write_audit_log(
            db, action="setting.bulk_update",
            entity_type="setting", entity_id="bulk",
            details={
                "keys": [r.key for r in results],
                "count": len(results),
            },
        )
        logger.info("Settings bulk update: %d settings updated", len(results))

    return results
