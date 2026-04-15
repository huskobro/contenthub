from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.db.models import SourceScan, NewsSource, NewsItem, UsedNewsRegistry
from .schemas import ScanCreate, ScanUpdate, ScanResponse


def _scans_base_query(
    source_id: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
):
    q = select(SourceScan)
    if source_id is not None:
        q = q.where(SourceScan.source_id == source_id)
    if status is not None:
        q = q.where(SourceScan.status == status)
    if scan_mode is not None:
        q = q.where(SourceScan.scan_mode == scan_mode)
    return q


async def list_scans(
    db: AsyncSession,
    source_id: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[SourceScan]:
    q = _scans_base_query(source_id=source_id, status=status, scan_mode=scan_mode).order_by(
        SourceScan.created_at.desc()
    )
    if offset:
        q = q.offset(offset)
    if limit is not None:
        q = q.limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def count_scans(
    db: AsyncSession,
    source_id: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
) -> int:
    q = _scans_base_query(source_id=source_id, status=status, scan_mode=scan_mode)
    count_stmt = select(func.count()).select_from(q.subquery())
    result = await db.execute(count_stmt)
    return int(result.scalar() or 0)


async def list_scans_with_source_summary(
    db: AsyncSession,
    source_id: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0,
) -> Tuple[List[ScanResponse], int]:
    """Return (items, total). Batched aggregates; no reviewed tracking (status removed)."""
    scans = await list_scans(
        db, source_id=source_id, status=status, scan_mode=scan_mode, limit=limit, offset=offset
    )
    total = await count_scans(db, source_id=source_id, status=status, scan_mode=scan_mode)
    if not scans:
        return [], total

    scan_ids = [s.id for s in scans]
    source_ids = list({s.source_id for s in scans})

    # Batch-load sources
    source_rows = await db.execute(
        select(NewsSource).where(NewsSource.id.in_(source_ids))
    )
    sources_map = {src.id: src for src in source_rows.scalars().all()}

    # Batch-load linked news counts per scan
    linked_rows = await db.execute(
        select(NewsItem.source_scan_id, func.count(NewsItem.id))
        .where(NewsItem.source_scan_id.in_(scan_ids))
        .group_by(NewsItem.source_scan_id)
    )
    linked_map = {row[0]: row[1] for row in linked_rows.all()}

    # Batch-load used news counts per scan (via NewsItem join)
    used_rows = await db.execute(
        select(NewsItem.source_scan_id, func.count(UsedNewsRegistry.id))
        .join(UsedNewsRegistry, UsedNewsRegistry.news_item_id == NewsItem.id)
        .where(NewsItem.source_scan_id.in_(scan_ids))
        .group_by(NewsItem.source_scan_id)
    )
    used_map = {row[0]: row[1] for row in used_rows.all()}

    result = []
    for scan in scans:
        source = sources_map.get(scan.source_id)
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
                source_name=source.name if source else None,
                source_status=source.status if source else None,
                linked_news_count_from_scan=linked_map.get(scan.id, 0),
                used_news_count_from_scan=used_map.get(scan.id, 0),
            )
        )
    return result, total


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
