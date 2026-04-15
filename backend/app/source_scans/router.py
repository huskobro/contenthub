"""
Source scans HTTP router.

Gate Sources Closure:
  - ``GET /source-scans`` returns a pagination envelope.
  - ``POST /{scan_id}/execute`` now writes an audit entry with the scan
    outcome (records counts + error).
  - ``POST /{scan_id}/retry`` — creates a new queued scan for the same
    source and immediately executes it. The original scan record is kept
    for history. Audit-logged.
  - ``GET /scheduler/status`` — surface the in-memory scheduler state so
    admins can verify the auto_scan settings wire without tailing logs.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.db.session import get_db
from app.visibility.dependencies import require_visible
from .schemas import (
    ScanCreate,
    ScanUpdate,
    ScanResponse,
    ScanExecuteResponse,
    ScanListResponse,
)
from . import service
from .scan_engine import execute_rss_scan
from .scheduler import SCHEDULER_STATE


class ScanExecuteRequest(BaseModel):
    """
    POST /source-scans/{scan_id}/execute istek govdesi.

    allow_followup: True → soft dedupe atlanir; hard dedupe korunur.
    """
    allow_followup: bool = False


router = APIRouter(
    prefix="/source-scans",
    tags=["source-scans"],
    dependencies=[Depends(require_visible("panel:source-scans"))],
)


def _actor_id(request: Request) -> Optional[str]:
    return request.headers.get("X-ContentHub-User-Id") or None


@router.get("/scheduler/status")
async def scheduler_status():
    """Expose the auto-scan scheduler effective settings + last tick outcome."""
    return dict(SCHEDULER_STATE)


@router.get("", response_model=ScanListResponse)
async def list_scans(
    source_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    scan_mode: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items, total = await service.list_scans_with_source_summary(
        db,
        source_id=source_id,
        status=status,
        scan_mode=scan_mode,
        limit=limit,
        offset=offset,
    )
    return ScanListResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    scan = await service.get_scan(db, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.post("", response_model=ScanResponse, status_code=201)
async def create_scan(
    payload: ScanCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await service.create_scan(db, payload)
    await write_audit_log(
        db,
        action="source_scan.create",
        entity_type="source_scan",
        entity_id=result.id,
        actor_id=_actor_id(request),
        details={"source_id": payload.source_id, "scan_mode": payload.scan_mode},
    )
    await db.commit()
    return result


@router.patch("/{scan_id}", response_model=ScanResponse)
async def update_scan(
    scan_id: str,
    payload: ScanUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    scan = await service.update_scan(db, scan_id, payload)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    await write_audit_log(
        db,
        action="source_scan.update",
        entity_type="source_scan",
        entity_id=scan_id,
        actor_id=_actor_id(request),
        details=payload.model_dump(exclude_unset=True),
    )
    await db.commit()
    return scan


@router.post("/{scan_id}/execute", response_model=ScanExecuteResponse)
async def execute_scan(
    scan_id: str,
    request: Request,
    payload: ScanExecuteRequest = ScanExecuteRequest(),
    db: AsyncSession = Depends(get_db),
):
    scan = await service.get_scan(db, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")

    if scan.status not in ("queued",):
        raise HTTPException(
            status_code=409,
            detail=f"Tarama calistirilamaz: mevcut durum '{scan.status}'. Yalnizca 'queued' taramalar calistirilabilir.",
        )

    try:
        result = await execute_rss_scan(db, scan_id, allow_followup=payload.allow_followup)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Audit entry with outcome summary
    await write_audit_log(
        db,
        action="source_scan.execute",
        entity_type="source_scan",
        entity_id=scan_id,
        actor_id=_actor_id(request),
        details={
            "status": result.get("status"),
            "fetched_count": result.get("fetched_count"),
            "new_count": result.get("new_count"),
            "skipped_dedupe": result.get("skipped_dedupe"),
            "error_summary": result.get("error_summary"),
            "allow_followup": payload.allow_followup,
        },
    )
    await db.commit()

    return ScanExecuteResponse(**result)


@router.post("/{scan_id}/retry", response_model=ScanResponse, status_code=202)
async def retry_scan(
    scan_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Retry a failed scan by creating a new queued scan for the same source,
    then executing it inline. The original scan record is preserved for
    history."""
    original = await service.get_scan(db, scan_id)
    if original is None:
        raise HTTPException(status_code=404, detail="Scan not found")

    from app.db.models import SourceScan
    new_scan = SourceScan(
        source_id=original.source_id,
        scan_mode=original.scan_mode if original.scan_mode in ("manual", "auto") else "manual",
        status="queued",
        requested_by=_actor_id(request) or "admin_retry",
        notes=f"Retry of {scan_id}",
    )
    db.add(new_scan)
    await db.commit()
    await db.refresh(new_scan)

    await write_audit_log(
        db,
        action="source_scan.retry",
        entity_type="source_scan",
        entity_id=new_scan.id,
        actor_id=_actor_id(request),
        details={"retried_from": scan_id, "source_id": original.source_id},
    )
    await db.commit()

    # Execute inline so the client gets a proper response body.
    try:
        await execute_rss_scan(db, new_scan.id, allow_followup=False)
    except ValueError:
        pass  # engine writes a failed record; client can poll

    refreshed = await service.get_scan(db, new_scan.id)
    return refreshed
