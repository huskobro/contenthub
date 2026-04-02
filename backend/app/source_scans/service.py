from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.db.models import SourceScan, NewsSource
from .schemas import ScanCreate, ScanUpdate, ScanResponse


async def list_scans(
    db: AsyncSession,
    source_id: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
) -> List[SourceScan]:
    q = select(SourceScan).order_by(SourceScan.created_at.desc())
    if source_id is not None:
        q = q.where(SourceScan.source_id == source_id)
    if status is not None:
        q = q.where(SourceScan.status == status)
    if scan_mode is not None:
        q = q.where(SourceScan.scan_mode == scan_mode)
    result = await db.execute(q)
    return list(result.scalars().all())


async def list_scans_with_source_summary(
    db: AsyncSession,
    source_id: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
) -> List[ScanResponse]:
    """Return scan list enriched with source_name and source_status."""
    scans = await list_scans(db, source_id=source_id, status=status, scan_mode=scan_mode)
    result = []
    for scan in scans:
        source_name = None
        source_status_val = None
        if scan.source_id:
            source_row = await db.execute(
                select(NewsSource).where(NewsSource.id == scan.source_id).limit(1)
            )
            source = source_row.scalar_one_or_none()
            if source:
                source_name = source.name
                source_status_val = source.status
        result.append(
            ScanResponse(
                id=scan.id,
                source_id=scan.source_id,
                scan_mode=scan.scan_mode,
                status=scan.status,
                requested_by=scan.requested_by,
                started_at=scan.started_at,
                finished_at=scan.finished_at,
                result_count=scan.result_count,
                error_summary=scan.error_summary,
                raw_result_preview_json=scan.raw_result_preview_json,
                notes=scan.notes,
                created_at=scan.created_at,
                updated_at=scan.updated_at,
                source_name=source_name,
                source_status=source_status_val,
            )
        )
    return result


async def get_scan(db: AsyncSession, scan_id: str) -> Optional[SourceScan]:
    result = await db.execute(
        select(SourceScan).where(SourceScan.id == scan_id)
    )
    return result.scalar_one_or_none()


async def create_scan(db: AsyncSession, payload: ScanCreate) -> SourceScan:
    # Validate source exists
    source = await db.execute(
        select(NewsSource).where(NewsSource.id == payload.source_id)
    )
    if source.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Source not found")

    scan = SourceScan(
        source_id=payload.source_id,
        scan_mode=payload.scan_mode,
        status=payload.status or "queued",
        requested_by=payload.requested_by,
        started_at=payload.started_at,
        finished_at=payload.finished_at,
        result_count=payload.result_count,
        error_summary=payload.error_summary,
        raw_result_preview_json=payload.raw_result_preview_json,
        notes=payload.notes,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan


async def update_scan(
    db: AsyncSession, scan_id: str, payload: ScanUpdate
) -> Optional[SourceScan]:
    scan = await get_scan(db, scan_id)
    if scan is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(scan, field, value)
    await db.commit()
    await db.refresh(scan)
    return scan
