"""
Visibility Engine service layer.

Business logic lives here; routers call these functions.

Supported operations (Phase 4 scope):
  - list_rules   : all rules, optional filters by rule_type / module_scope / role_scope
  - get_rule     : single rule by id
  - create_rule  : insert new rule
  - update_rule  : partial update by id

Intentionally deferred:
  - runtime visibility resolution (merge rules with requesting context)
  - settings + visibility merge logic
  - precedence / inheritance engine
  - delete
  - cache
  - SSE invalidation
  - bulk operations
"""

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import VisibilityRule
from app.audit.service import write_audit_log
from app.visibility.schemas import VisibilityRuleCreate, VisibilityRuleUpdate


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
