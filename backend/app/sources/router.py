"""
News source HTTP router.

Gate Sources Closure:
  - ``GET /sources`` returns a pagination envelope ``SourceListResponse``
    with ``items`` / ``total`` / ``offset`` / ``limit``.
  - Added ``POST /sources/{id}/trigger-scan`` — admin "Scan now" button
    hook; delegates to source_scans service to queue + execute, returns
    the scan id so the client can subscribe to SSE updates.
  - Added ``GET /sources/{id}/health`` — source health surface for the
    admin Sources page.
  - Audit log now captures actor + filters on every CRUD action.

Phase Final F2.3:
  - News sources are a global admin-managed registry. Entire router is
    locked behind ``require_admin``; non-admin callers receive 403 even
    for read endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.db.session import get_db
from app.audit.service import write_audit_log
from app.visibility.dependencies import require_visible
from .schemas import (
    SourceCreate,
    SourceUpdate,
    SourceResponse,
    SourceListResponse,
    VALID_SOURCE_CATEGORIES,
)
from . import service

router = APIRouter(
    prefix="/sources",
    tags=["sources"],
    dependencies=[
        Depends(require_admin),
        Depends(require_visible("panel:sources")),
    ],
)


def _actor_id(request: Request) -> Optional[str]:
    return request.headers.get("X-ContentHub-User-Id") or None


@router.get("/category-options")
async def get_category_options():
    """M43: Kaynak kategori secenekleri — gorsel stil eslemesi ile birebir."""
    labels = {
        "breaking": "Son Dakika",
        "tech": "Teknoloji",
        "corporate": "Kurumsal",
        "sport": "Spor",
        "finance": "Finans",
        "weather": "Hava Durumu",
        "science": "Bilim/Teknik",
        "entertainment": "Eglence/Magazin",
        "dark": "Gundem",
    }
    return [
        {"value": cat, "label": labels.get(cat, cat)}
        for cat in VALID_SOURCE_CATEGORIES
    ]


@router.get("", response_model=SourceListResponse)
async def list_sources(
    source_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    scan_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Kaynak adinda arama (case-insensitive)"),
    include_test_data: bool = Query(
        False, description="Test/demo kayitlarini dahil et (varsayilan: False)"
    ),
    limit: int = Query(50, ge=1, le=200, description="Sayfa boyutu (max 200)"),
    offset: int = Query(0, ge=0, description="Kayit atlama sayisi"),
    db: AsyncSession = Depends(get_db),
):
    items, total = await service.list_sources_with_scan_summary(
        db,
        source_type=source_type,
        status=status,
        scan_mode=scan_mode,
        search=search,
        include_test_data=include_test_data,
        limit=limit,
        offset=offset,
    )
    return SourceListResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(source_id: str, db: AsyncSession = Depends(get_db)):
    source = await service.get_source(db, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    # Return enriched response — single-row so N+1 concern doesn't apply.
    items, _ = await service.list_sources_with_scan_summary(
        db, search=None, include_test_data=True, limit=1000, offset=0
    )
    for item in items:
        if item.id == source_id:
            return item
    return SourceResponse.model_validate(source)


@router.get("/{source_id}/health")
async def get_source_health(source_id: str, db: AsyncSession = Depends(get_db)):
    """Source health surface — recent scan outcomes + failure summary."""
    source = await service.get_source(db, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    from app.db.models import SourceScan
    from sqlalchemy import select, func as sqlfunc
    from datetime import datetime, timezone, timedelta

    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    total_row = await db.execute(
        select(sqlfunc.count()).select_from(SourceScan).where(
            SourceScan.source_id == source_id
        )
    )
    total = int(total_row.scalar() or 0)

    recent_rows = await db.execute(
        select(SourceScan)
        .where(
            SourceScan.source_id == source_id,
            SourceScan.created_at >= recent_cutoff,
        )
        .order_by(SourceScan.created_at.desc())
        .limit(25)
    )
    recent = list(recent_rows.scalars().all())

    failed_recent = sum(1 for r in recent if r.status == "failed")
    completed_recent = sum(1 for r in recent if r.status == "completed")
    last = recent[0] if recent else None

    health_label = "unknown"
    if not recent:
        health_label = "no_recent_scans"
    elif failed_recent == 0:
        health_label = "healthy"
    elif failed_recent >= 3:
        health_label = "unhealthy"
    else:
        health_label = "degraded"

    return {
        "source_id": source_id,
        "source_name": source.name,
        "health": health_label,
        "total_scans": total,
        "recent_window_days": 7,
        "recent_scan_count": len(recent),
        "recent_failed_count": failed_recent,
        "recent_completed_count": completed_recent,
        "last_scan_id": last.id if last else None,
        "last_scan_status": last.status if last else None,
        "last_scan_error": last.error_summary if last else None,
        "last_scan_finished_at": last.finished_at.isoformat() if last and last.finished_at else None,
    }


@router.post("", response_model=SourceResponse, status_code=201)
async def create_source(
    payload: SourceCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await service.create_source(db, payload)
    await write_audit_log(
        db,
        action="source.create",
        entity_type="source",
        entity_id=str(result.id),
        actor_id=_actor_id(request),
        details={"name": result.name, "feed_url": result.feed_url},
    )
    await db.commit()
    return result


@router.patch("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: str,
    payload: SourceUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    source = await service.update_source(db, source_id, payload)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    await write_audit_log(
        db,
        action="source.update",
        entity_type="source",
        entity_id=source_id,
        actor_id=_actor_id(request),
        details=payload.model_dump(exclude_unset=True),
    )
    await db.commit()
    return source


@router.delete("/{source_id}", status_code=204)
async def delete_source(
    source_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_source(db, source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    await write_audit_log(
        db,
        action="source.delete",
        entity_type="source",
        entity_id=source_id,
        actor_id=_actor_id(request),
    )
    await db.commit()


@router.post("/{source_id}/trigger-scan", status_code=202)
async def trigger_scan(
    source_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Admin "Scan now" button — queues a manual scan and executes it inline.

    Returns 202 + the scan id so the caller can subscribe to SSE progress.
    """
    source = await service.get_source(db, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    if source.source_type != "rss":
        raise HTTPException(status_code=422, detail="Only rss sources are scannable.")

    from app.db.models import SourceScan
    from app.source_scans.scan_engine import execute_rss_scan

    scan = SourceScan(
        source_id=source_id,
        scan_mode="manual",
        status="queued",
        requested_by=_actor_id(request) or "admin_trigger",
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    await write_audit_log(
        db,
        action="source.trigger_scan",
        entity_type="source",
        entity_id=source_id,
        actor_id=_actor_id(request),
        details={"scan_id": scan.id},
    )
    await db.commit()

    # Execute inline (keeps behavior symmetric with scheduler; admin-side
    # scans are typically few and this simplifies SSE wiring).
    try:
        await execute_rss_scan(db, scan.id, allow_followup=True)
    except Exception as exc:
        # execute_rss_scan itself writes a failed scan record; surface 202
        # plus the scan id so the client can see the failure via SSE / GET.
        pass

    return {"scan_id": scan.id, "source_id": source_id}
