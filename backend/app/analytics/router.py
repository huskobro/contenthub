"""
Analytics Router — M8-C1.

HTTP katmanı: iş mantığı yok, yalnızca servis çağrıları.

Endpoint'ler:
  GET /analytics/overview    : Platform genel metrikleri
  GET /analytics/operations  : Operasyon metrikleri (step süresi, render)
"""

from fastapi import APIRouter, Depends, Query

from app.db.session import get_db
from app.visibility.dependencies import require_visible
from app.analytics import service
from app.analytics.schemas import OverviewMetrics, OperationsMetrics

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_visible("panel:analytics"))])

_VALID_WINDOWS = ("last_7d", "last_30d", "last_90d", "all_time")


@router.get("/overview", response_model=OverviewMetrics)
async def get_overview(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    session=Depends(get_db),
):
    """
    Platform genel metrikleri.

    Zaman penceresi (window):
      last_7d  : son 7 gün
      last_30d : son 30 gün
      last_90d : son 90 gün
      all_time : tüm zamanlar (varsayılan)
    """
    if window not in _VALID_WINDOWS:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz window: '{window}'. Geçerli değerler: {list(_VALID_WINDOWS)}",
        )
    return await service.get_overview_metrics(session=session, window=window)


@router.get("/operations", response_model=OperationsMetrics)
async def get_operations(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    session=Depends(get_db),
):
    """
    Operasyon metrikleri.

    avg_render_duration_seconds: render step ortalama süresi.
    step_stats: her step_key için count, avg_elapsed, failed_count.
    provider_error_rate: M8-C1'de desteklenmiyor (None döner).
    """
    if window not in _VALID_WINDOWS:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz window: '{window}'. Geçerli değerler: {list(_VALID_WINDOWS)}",
        )
    return await service.get_operations_metrics(session=session, window=window)
