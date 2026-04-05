"""
Audit Log API Router — M15.

Endpoints:
  GET /audit-logs           — audit log kayitlarini filtreli listele
  GET /audit-logs/{log_id}  — tek audit log kaydinin detayi
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import AuditLog
from app.visibility.dependencies import require_visible

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/audit-logs",
    tags=["audit-logs"],
    dependencies=[Depends(require_visible("panel:audit-logs"))],
)


class AuditLogResponse(BaseModel):
    id: str
    actor_type: str
    actor_id: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details_json: str = "{}"
    created_at: str


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Aksiyon prefix filtresi"),
    entity_type: Optional[str] = Query(None, description="Varlik tipi filtresi"),
    entity_id: Optional[str] = Query(None, description="Varlik ID filtresi"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AuditLogListResponse:
    """Audit log kayitlarini filtreli olarak doner."""
    stmt = select(AuditLog)
    count_stmt = select(func.count(AuditLog.id))

    if action:
        stmt = stmt.where(AuditLog.action.startswith(action))
        count_stmt = count_stmt.where(AuditLog.action.startswith(action))
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
        count_stmt = count_stmt.where(AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
        count_stmt = count_stmt.where(AuditLog.entity_id == entity_id)

    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    stmt = stmt.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    items = [
        AuditLogResponse(
            id=row.id,
            actor_type=row.actor_type,
            actor_id=row.actor_id,
            action=row.action,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            details_json=row.details_json or "{}",
            created_at=row.created_at.isoformat() if row.created_at else "",
        )
        for row in rows
    ]

    return AuditLogListResponse(items=items, total=total)


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
) -> AuditLogResponse:
    """Tek audit log kaydinin detayini doner."""
    stmt = select(AuditLog).where(AuditLog.id == log_id)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Audit log bulunamadi")
    return AuditLogResponse(
        id=row.id,
        actor_type=row.actor_type,
        actor_id=row.actor_id,
        action=row.action,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        details_json=row.details_json or "{}",
        created_at=row.created_at.isoformat() if row.created_at else "",
    )
