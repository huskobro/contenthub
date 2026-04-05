"""
Visibility Engine API router.

Endpoints (Phase 4 + M11 + M22-A):
  GET    /visibility-rules                  — list all rules (optional filters)
  GET    /visibility-rules/resolve          — runtime visibility resolution (M11)
  GET    /visibility-rules/{rule_id}        — fetch single rule by id
  POST   /visibility-rules                  — create new rule
  PATCH  /visibility-rules/{rule_id}        — partial update
  DELETE /visibility-rules/{rule_id}        — soft-delete (M22-A)
  POST   /visibility-rules/bulk-status      — bulk status update (M22-A)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.audit.service import write_audit_log
from app.visibility import service
from app.visibility.dependencies import require_visible
from app.visibility.schemas import (
    VisibilityRuleCreate,
    VisibilityRuleResponse,
    VisibilityRuleUpdate,
)

router = APIRouter(prefix="/visibility-rules", tags=["visibility"])


@router.get("", response_model=List[VisibilityRuleResponse], dependencies=[Depends(require_visible("panel:visibility"))])
async def list_rules(
    rule_type: Optional[str] = Query(None, description="Filter by rule_type"),
    module_scope: Optional[str] = Query(None, description="Filter by module_scope"),
    role_scope: Optional[str] = Query(None, description="Filter by role_scope"),
    db: AsyncSession = Depends(get_db),
) -> List[VisibilityRuleResponse]:
    rows = await service.list_rules(
        db,
        rule_type=rule_type,
        module_scope=module_scope,
        role_scope=role_scope,
    )
    return [VisibilityRuleResponse.model_validate(r) for r in rows]


@router.get("/resolve")
async def resolve_visibility_endpoint(
    target_key: str,
    role: Optional[str] = None,
    mode: Optional[str] = None,
    module_scope: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Resolve effective visibility for a target_key in given context."""
    from app.visibility.resolver import resolve_visibility
    result = await resolve_visibility(db, target_key, role=role, mode=mode, module_scope=module_scope)
    return result


@router.get("/{rule_id}", response_model=VisibilityRuleResponse, dependencies=[Depends(require_visible("panel:visibility"))])
async def get_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
) -> VisibilityRuleResponse:
    row = await service.get_rule(db, rule_id)
    return VisibilityRuleResponse.model_validate(row)


@router.post("", response_model=VisibilityRuleResponse, status_code=201, dependencies=[Depends(require_visible("panel:visibility"))])
async def create_rule(
    payload: VisibilityRuleCreate,
    db: AsyncSession = Depends(get_db),
) -> VisibilityRuleResponse:
    row = await service.create_rule(db, payload)
    await write_audit_log(db, action="visibility_rule.create", entity_type="visibility_rule", entity_id=str(row.id))
    return VisibilityRuleResponse.model_validate(row)


@router.patch("/{rule_id}", response_model=VisibilityRuleResponse, dependencies=[Depends(require_visible("panel:visibility"))])
async def update_rule(
    rule_id: str,
    payload: VisibilityRuleUpdate,
    db: AsyncSession = Depends(get_db),
) -> VisibilityRuleResponse:
    row = await service.update_rule(db, rule_id, payload)
    await write_audit_log(db, action="visibility_rule.update", entity_type="visibility_rule", entity_id=rule_id)
    return VisibilityRuleResponse.model_validate(row)


@router.delete("/{rule_id}", response_model=VisibilityRuleResponse, dependencies=[Depends(require_visible("panel:visibility"))])
async def delete_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
) -> VisibilityRuleResponse:
    """Soft-delete: kuralı inactive yapar. Resolver tarafından artık okunmaz."""
    row = await service.delete_rule(db, rule_id)
    return VisibilityRuleResponse.model_validate(row)


@router.post("/bulk-status", response_model=List[VisibilityRuleResponse], dependencies=[Depends(require_visible("panel:visibility"))])
async def bulk_update_status(
    body: dict,
    db: AsyncSession = Depends(get_db),
) -> List[VisibilityRuleResponse]:
    """Toplu status güncelleme. Body: { "rule_ids": [...], "status": "active"|"inactive" }"""
    rule_ids = body.get("rule_ids", [])
    new_status = body.get("status", "")
    rows = await service.bulk_update_status(db, rule_ids, new_status)
    return [VisibilityRuleResponse.model_validate(r) for r in rows]
