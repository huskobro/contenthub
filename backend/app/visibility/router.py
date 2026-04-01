"""
Visibility Engine API router.

Endpoints (Phase 4 scope):
  GET    /visibility-rules                  — list all rules (optional filters)
  GET    /visibility-rules/{rule_id}        — fetch single rule by id
  POST   /visibility-rules                  — create new rule
  PATCH  /visibility-rules/{rule_id}        — partial update

Intentionally absent:
  DELETE, bulk operations, runtime resolution endpoint, admin/user split surfaces.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.visibility import service
from app.visibility.schemas import (
    VisibilityRuleCreate,
    VisibilityRuleResponse,
    VisibilityRuleUpdate,
)

router = APIRouter(prefix="/visibility-rules", tags=["visibility"])


@router.get("", response_model=List[VisibilityRuleResponse])
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


@router.get("/{rule_id}", response_model=VisibilityRuleResponse)
async def get_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
) -> VisibilityRuleResponse:
    row = await service.get_rule(db, rule_id)
    return VisibilityRuleResponse.model_validate(row)


@router.post("", response_model=VisibilityRuleResponse, status_code=201)
async def create_rule(
    payload: VisibilityRuleCreate,
    db: AsyncSession = Depends(get_db),
) -> VisibilityRuleResponse:
    row = await service.create_rule(db, payload)
    return VisibilityRuleResponse.model_validate(row)


@router.patch("/{rule_id}", response_model=VisibilityRuleResponse)
async def update_rule(
    rule_id: str,
    payload: VisibilityRuleUpdate,
    db: AsyncSession = Depends(get_db),
) -> VisibilityRuleResponse:
    row = await service.update_rule(db, rule_id, payload)
    return VisibilityRuleResponse.model_validate(row)
