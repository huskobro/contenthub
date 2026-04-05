"""
Visibility Engine service layer.

Business logic lives here; routers call these functions.

Supported operations:
  - list_rules   : all rules, optional filters by rule_type / module_scope / role_scope
  - get_rule     : single rule by id
  - create_rule  : insert new rule
  - update_rule  : partial update by id
  - delete_rule  : soft-delete (status → inactive) with audit (M22-A)
  - bulk_update_status : birden fazla kuralı aynı anda active/inactive yap (M22-A)

Runtime resolution: resolver.py (M11+M22-A)
Settings merge: settings_resolver ayar değerlerini, visibility resolver erişim kurallarını
  bağımsız olarak çözümler. İkisi farklı sorumluluklar; merge yerine composition kullanılır.
"""

import logging
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import VisibilityRule
from app.audit.service import write_audit_log
from app.visibility.schemas import VisibilityRuleCreate, VisibilityRuleUpdate

logger = logging.getLogger(__name__)


async def list_rules(
    db: AsyncSession,
    rule_type: Optional[str] = None,
    module_scope: Optional[str] = None,
    role_scope: Optional[str] = None,
) -> List[VisibilityRule]:
    stmt = (
        select(VisibilityRule)
        .order_by(VisibilityRule.priority.desc(), VisibilityRule.rule_type, VisibilityRule.target_key)
    )
    if rule_type is not None:
        stmt = stmt.where(VisibilityRule.rule_type == rule_type)
    if module_scope is not None:
        stmt = stmt.where(VisibilityRule.module_scope == module_scope)
    if role_scope is not None:
        stmt = stmt.where(VisibilityRule.role_scope == role_scope)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_rule(db: AsyncSession, rule_id: str) -> VisibilityRule:
    result = await db.execute(
        select(VisibilityRule).where(VisibilityRule.id == rule_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VisibilityRule '{rule_id}' not found.",
        )
    return row


async def create_rule(db: AsyncSession, payload: VisibilityRuleCreate) -> VisibilityRule:
    row = VisibilityRule(**payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db, action="visibility.rule.create",
        entity_type="visibility_rule", entity_id=row.id,
        details={"rule_type": row.rule_type, "target_key": row.target_key},
    )
    return row


async def update_rule(
    db: AsyncSession,
    rule_id: str,
    payload: VisibilityRuleUpdate,
) -> VisibilityRule:
    row = await get_rule(db, rule_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return row
    for field, value in changes.items():
        setattr(row, field, value)
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db, action="visibility.rule.update",
        entity_type="visibility_rule", entity_id=row.id,
        details={"changed_fields": list(changes.keys())},
    )
    return row


async def delete_rule(db: AsyncSession, rule_id: str) -> VisibilityRule:
    """
    Soft-delete: status → inactive. Kural silinmez, devre dışı bırakılır.
    Resolver zaten sadece status='active' kuralları okur.
    """
    row = await get_rule(db, rule_id)
    if row.status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"VisibilityRule '{rule_id}' is already inactive.",
        )
    row.status = "inactive"
    await db.commit()
    await db.refresh(row)
    await write_audit_log(
        db, action="visibility.rule.delete",
        entity_type="visibility_rule", entity_id=row.id,
        details={"target_key": row.target_key, "soft_delete": True},
    )
    logger.info("Visibility rule soft-deleted: %s (target=%s)", rule_id, row.target_key)
    return row


async def bulk_update_status(
    db: AsyncSession,
    rule_ids: List[str],
    new_status: str,
) -> List[VisibilityRule]:
    """
    Birden fazla kuralın status alanını topluca günceller.
    Geçerli status: 'active', 'inactive'.
    """
    if new_status not in ("active", "inactive"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Geçersiz status: '{new_status}'. Geçerli: active, inactive",
        )
    if not rule_ids:
        return []

    results = []
    for rid in rule_ids:
        result = await db.execute(
            select(VisibilityRule).where(VisibilityRule.id == rid)
        )
        row = result.scalar_one_or_none()
        if row is None:
            continue
        if row.status != new_status:
            row.status = new_status
            results.append(row)

    if results:
        await db.commit()
        for row in results:
            await db.refresh(row)
        await write_audit_log(
            db, action="visibility.rule.bulk_update",
            entity_type="visibility_rule", entity_id="bulk",
            details={
                "rule_ids": [r.id for r in results],
                "new_status": new_status,
                "count": len(results),
            },
        )
        logger.info("Visibility bulk status update: %d rules → %s", len(results), new_status)

    return results
