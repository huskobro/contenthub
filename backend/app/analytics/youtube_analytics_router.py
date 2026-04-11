"""
YouTube Analytics Router — Sprint 1 / Faz YT-A1.

Exposes YouTubeAnalyticsService snapshot reads and manual sync triggers.
HTTP katmani — is mantigi yok, youtube_analytics_service'i cagirir.

Endpoints (prefix: /analytics/youtube):
  GET  /channel-totals?connection_id=...&window_days=28
  GET  /top-videos?connection_id=...&window_days=28&limit=10
  GET  /retention/{video_id}?connection_id=...
  GET  /demographics?connection_id=...&video_id=
  GET  /traffic-sources?connection_id=...&video_id=
  GET  /devices?connection_id=...&video_id=
  GET  /last-sync?connection_id=...
  POST /sync?connection_id=...&window_days=28          (manual backfill)
  POST /sync-all                                       (all connections)

Tum endpoint'ler panel:analytics visibility guard altinda.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics import youtube_analytics_service as yts
from app.db.session import get_db
from app.visibility.dependencies import require_visible

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics/youtube",
    tags=["analytics-youtube"],
    dependencies=[Depends(require_visible("panel:analytics"))],
)


def _validate_window_days(window_days: int) -> int:
    if window_days < 1 or window_days > 365:
        raise HTTPException(
            status_code=400,
            detail="window_days 1..365 araliginda olmalidir.",
        )
    return window_days


# ---------------------------------------------------------------------------
# Read endpoints
# ---------------------------------------------------------------------------


@router.get("/channel-totals")
async def get_channel_totals(
    connection_id: str = Query(..., description="PlatformConnection.id"),
    window_days: int = Query(28, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    _validate_window_days(window_days)
    return await yts.read_channel_totals(db, connection_id, window_days=window_days)


@router.get("/top-videos")
async def get_top_videos(
    connection_id: str = Query(...),
    window_days: int = Query(28, ge=1, le=365),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    _validate_window_days(window_days)
    return {
        "connection_id": connection_id,
        "window_days": window_days,
        "videos": await yts.read_top_videos(
            db, connection_id, window_days=window_days, limit=limit,
        ),
    }


@router.get("/retention/{video_id}")
async def get_retention_curve(
    video_id: str,
    connection_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return {
        "connection_id": connection_id,
        "video_id": video_id,
        "curve": await yts.read_retention_curve(db, connection_id, video_id),
    }


@router.get("/demographics")
async def get_demographics(
    connection_id: str = Query(...),
    video_id: str = Query("", description="Bos birakilirsa kanal toplami"),
    db: AsyncSession = Depends(get_db),
):
    return {
        "connection_id": connection_id,
        "video_id": video_id,
        "rows": await yts.read_demographics(db, connection_id, video_id=video_id),
    }


@router.get("/traffic-sources")
async def get_traffic_sources(
    connection_id: str = Query(...),
    video_id: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    return {
        "connection_id": connection_id,
        "video_id": video_id,
        "rows": await yts.read_traffic_sources(db, connection_id, video_id=video_id),
    }


@router.get("/devices")
async def get_devices(
    connection_id: str = Query(...),
    video_id: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    return {
        "connection_id": connection_id,
        "video_id": video_id,
        "rows": await yts.read_devices(db, connection_id, video_id=video_id),
    }


@router.get("/last-sync")
async def get_last_sync(
    connection_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await yts.read_last_sync(db, connection_id)
    if result is None:
        return {"connection_id": connection_id, "last_sync": None}
    return {"connection_id": connection_id, "last_sync": result}


# ---------------------------------------------------------------------------
# Write (sync) endpoints
# ---------------------------------------------------------------------------


@router.post("/sync")
async def trigger_sync(
    connection_id: str = Query(...),
    window_days: int = Query(28, ge=1, le=365),
    run_kind: str = Query("manual", pattern="^(manual|backfill|daily)$"),
    db: AsyncSession = Depends(get_db),
):
    _validate_window_days(window_days)
    service = yts.YouTubeAnalyticsService()
    log = await service.run_sync(
        db,
        connection_id,
        window_days=window_days,
        trigger_source="api",
        run_kind=run_kind,
    )
    return {
        "connection_id": connection_id,
        "log": {
            "id": log.id,
            "status": log.status,
            "rows_written": log.rows_written,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "finished_at": log.finished_at.isoformat() if log.finished_at else None,
            "error_message": log.error_message,
        },
    }


@router.post("/sync-all")
async def trigger_sync_all(
    db: AsyncSession = Depends(get_db),
):
    service = yts.YouTubeAnalyticsService()
    results = await service.run_daily_sync_all(db, trigger_source="api")
    return {"results": results, "count": len(results)}
