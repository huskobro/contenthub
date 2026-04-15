"""
Analytics Router — M8-C1, M16, M17, M18, Dashboard V2, Publish Analytics.

HTTP katmanı: iş mantığı yok, yalnızca servis çağrıları.

Endpoint'ler:
  GET /analytics/overview       : Platform genel metrikleri (date_from/date_to destekli)
  GET /analytics/operations     : Operasyon metrikleri (step süresi, render, provider)
  GET /analytics/source-impact  : Kaynak etki metrikleri (M17-A)
  GET /analytics/channel        : Kanal özet metrikleri (M17-C)
  GET /analytics/content        : İçerik analytics metrikleri (M18-A)
  GET /analytics/template-impact: Template/blueprint etki metrikleri (Faz G)
  GET /analytics/prompt-assembly: Prompt Assembly metrikleri (M37)
  GET /analytics/dashboard      : Admin Dashboard V2 aggregated summary
  GET /analytics/publish        : Publish-specific analytics
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, Response

from app.db.session import get_db
from app.visibility.dependencies import require_visible, get_active_user_id
from app.analytics import service
from app.analytics import export_service
from app.analytics.audit import record_analytics_view
from app.analytics.schemas import (
    OverviewMetrics,
    OperationsMetrics,
    SourceImpactMetrics,
    ChannelOverviewMetrics,
    ContentMetrics,
    TemplateImpactMetrics,
    PromptAssemblyMetrics,
    DashboardSummary,
    PublishAnalytics,
    ChannelPerformance,
)

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(require_visible("panel:analytics"))])


# ---------------------------------------------------------------------------
# Audit helper (Gate 5 F1) — fire-and-forget, never raises.
# ---------------------------------------------------------------------------

async def _audit_view(
    session,
    actor_id: Optional[str],
    kind: str,
    *,
    window: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
    extra: Optional[dict] = None,
) -> None:
    filters = {
        "window": window,
        "date_from": date_from,
        "date_to": date_to,
        "user_id": user_id,
        "channel_profile_id": channel_profile_id,
        "platform": platform,
    }
    if extra:
        filters.update(extra)
    filters = {k: v for k, v in filters.items() if v is not None}
    await record_analytics_view(session, report_kind=kind, actor_id=actor_id, filters=filters)

_VALID_WINDOWS = ("last_7d", "last_30d", "last_90d", "all_time")


def _validate_window(window: str) -> None:
    if window not in _VALID_WINDOWS:
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz window: '{window}'. Gecerli degerler: {list(_VALID_WINDOWS)}",
        )


def _parse_date(value: Optional[str], param_name: str) -> Optional[datetime]:
    """ISO tarih string'ini datetime'a çevirir; geçersizse 400 döner."""
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz {param_name} formati: '{value}'. ISO 8601 formati bekleniyor (ornek: 2026-01-01T00:00:00).",
        )


@router.get("/overview", response_model=OverviewMetrics)
async def get_overview(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    date_from: Optional[str] = Query(default=None, description="Baslangic tarihi (ISO 8601)"),
    date_to: Optional[str] = Query(default=None, description="Bitis tarihi (ISO 8601)"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (youtube, ...)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Platform genel metrikleri.

    date_from/date_to verilmisse window cutoff'u yerine bunlar kullanilir.
    """
    _validate_window(window)
    df = _parse_date(date_from, "date_from")
    dt = _parse_date(date_to, "date_to")
    result = await service.get_overview_metrics(
        session=session, window=window, date_from=df, date_to=dt,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "overview",
                      window=window, date_from=date_from, date_to=date_to,
                      user_id=user_id, channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/operations", response_model=OperationsMetrics)
async def get_operations(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (youtube, ...)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Operasyon metrikleri.

    avg_render_duration_seconds: render step ortalama suresi.
    step_stats: her step_key icin count, avg_elapsed, failed_count.
    provider_error_rate: provider-dependent step basarisizlik orani.
    """
    _validate_window(window)
    result = await service.get_operations_metrics(
        session=session, window=window,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "operations",
                      window=window, user_id=user_id,
                      channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/source-impact", response_model=SourceImpactMetrics)
async def get_source_impact(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi (Hybrid B: contract only — system-scope)"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi (Hybrid B: contract only — system-scope)"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (Hybrid B: contract only — system-scope)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Kaynak etki metrikleri.

    Haber kaynagi bazli aggregation: kaynak sayisi, tarama, haber, kullanim.

    Hybrid B (Gate 5): user/channel/platform parametreleri backend contract
    icin kabul edilir, ama sistem-scope aggregation oldugu icin etkisizdir.
    UI tarafinda bu filtreler gosterilmez.
    """
    _validate_window(window)
    result = await service.get_source_impact_metrics(
        session=session, window=window,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "source-impact",
                      window=window, user_id=user_id,
                      channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/channel", response_model=ChannelOverviewMetrics)
async def get_channel_overview(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (youtube, ...)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Kanal ozet metrikleri.

    YouTube yayin gecmisi ve basari durumu.
    """
    _validate_window(window)
    result = await service.get_channel_overview_metrics(
        session=session, window=window,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "channel",
                      window=window, user_id=user_id,
                      channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/template-impact", response_model=TemplateImpactMetrics)
async def get_template_impact(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (youtube, ...)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Template ve blueprint bazli is etki metrikleri.

    Her template/blueprint icin toplam is, basari orani ve ortalama sure.
    """
    _validate_window(window)
    result = await service.get_template_impact_metrics(
        session=session, window=window,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "template-impact",
                      window=window, user_id=user_id,
                      channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/content", response_model=ContentMetrics)
async def get_content_metrics(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    date_from: Optional[str] = Query(default=None, description="Baslangic tarihi (ISO 8601)"),
    date_to: Optional[str] = Query(default=None, description="Bitis tarihi (ISO 8601)"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (youtube, ...)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Icerik analytics metrikleri.

    Modul dagilimi, icerik uretim sayilari, yayin durumu ve ortalama
    yayina kadar gecen sure.
    """
    _validate_window(window)
    df = _parse_date(date_from, "date_from")
    dt = _parse_date(date_to, "date_to")
    result = await service.get_content_metrics(
        session=session, window=window, date_from=df, date_to=dt,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "content",
                      window=window, date_from=date_from, date_to=date_to,
                      user_id=user_id, channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/prompt-assembly", response_model=PromptAssemblyMetrics)
async def get_prompt_assembly_metrics(
    window: str = Query(default="all_time", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    date_from: Optional[str] = Query(default=None, description="Baslangic tarihi (ISO 8601)"),
    date_to: Optional[str] = Query(default=None, description="Bitis tarihi (ISO 8601)"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi (Hybrid B: contract only — system-scope)"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi (Hybrid B: contract only — system-scope)"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (Hybrid B: contract only — system-scope)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Prompt Assembly calisma metrikleri.

    Toplam assembly sayisi, dry run / production dagilimi,
    modul ve provider bazli detaylar.

    Hybrid B (Gate 5): user/channel/platform parametreleri backend contract
    icin kabul edilir, ama sistem-scope aggregation oldugu icin etkisizdir.
    UI tarafinda bu filtreler gosterilmez.
    """
    _validate_window(window)
    df = _parse_date(date_from, "date_from")
    dt = _parse_date(date_to, "date_to")
    result = await service.get_prompt_assembly_metrics(
        session=session, window=window, date_from=df, date_to=dt,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "prompt-assembly",
                      window=window, date_from=date_from, date_to=date_to,
                      user_id=user_id, channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    window: str = Query(default="last_30d", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    date_from: Optional[str] = Query(default=None, description="Baslangic tarihi (ISO 8601)"),
    date_to: Optional[str] = Query(default=None, description="Bitis tarihi (ISO 8601)"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (youtube, ...)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Admin Dashboard V2 aggregated summary.

    KPI'lar, gunluk trend, modul dagilimi, platform dagilimi,
    kuyruk durumu ve son hatalar.
    """
    _validate_window(window)
    df = _parse_date(date_from, "date_from")
    dt = _parse_date(date_to, "date_to")
    result = await service.get_dashboard_summary(
        session=session, window=window, date_from=df, date_to=dt,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "dashboard",
                      window=window, date_from=date_from, date_to=date_to,
                      user_id=user_id, channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/publish", response_model=PublishAnalytics)
async def get_publish_analytics(
    window: str = Query(default="last_30d", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    date_from: Optional[str] = Query(default=None, description="Baslangic tarihi (ISO 8601)"),
    date_to: Optional[str] = Query(default=None, description="Bitis tarihi (ISO 8601)"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (youtube, ...)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Publish-specific analytics.

    Platform kirilimi, gunluk publish trendi, basari orani.
    """
    _validate_window(window)
    df = _parse_date(date_from, "date_from")
    dt = _parse_date(date_to, "date_to")
    result = await service.get_publish_analytics(
        session=session, window=window, date_from=df, date_to=dt,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "publish",
                      window=window, date_from=date_from, date_to=date_to,
                      user_id=user_id, channel_profile_id=channel_profile_id, platform=platform)
    return result


@router.get("/channel-performance", response_model=ChannelPerformance)
async def get_channel_performance(
    window: str = Query(default="last_30d", description="Zaman penceresi: last_7d | last_30d | last_90d | all_time"),
    date_from: Optional[str] = Query(default=None, description="Baslangic tarihi (ISO 8601)"),
    date_to: Optional[str] = Query(default=None, description="Bitis tarihi (ISO 8601)"),
    user_id: Optional[str] = Query(default=None, description="Kullanici filtresi"),
    channel_profile_id: Optional[str] = Query(default=None, description="Kanal profil filtresi"),
    platform: Optional[str] = Query(default=None, description="Platform filtresi (youtube, ...)"),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Kanal bazli performans analytics.

    Production + publish + engagement + channel health metrikleri.
    channel_profile_id verilmemisse tum kanallarin siralama listesi de doner.
    """
    _validate_window(window)
    df = _parse_date(date_from, "date_from")
    dt = _parse_date(date_to, "date_to")
    result = await service.get_channel_performance(
        session=session, window=window, date_from=df, date_to=dt,
        user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
    )
    await _audit_view(session, actor_id, "channel-performance",
                      window=window, date_from=date_from, date_to=date_to,
                      user_id=user_id, channel_profile_id=channel_profile_id, platform=platform)
    return result


# ---------------------------------------------------------------------------
# Export endpoint (Gate 5 C1) — single surface for all kinds.
# ---------------------------------------------------------------------------

_KIND_TO_SERVICE = {
    "overview": "get_overview_metrics",
    "operations": "get_operations_metrics",
    "content": "get_content_metrics",
    "source-impact": "get_source_impact_metrics",
    "channel": "get_channel_overview_metrics",
    "template-impact": "get_template_impact_metrics",
    "prompt-assembly": "get_prompt_assembly_metrics",
    "dashboard": "get_dashboard_summary",
    "publish": "get_publish_analytics",
    "channel-performance": "get_channel_performance",
}

_KIND_SUPPORTS_DATE_RANGE = {
    "overview", "content", "prompt-assembly",
    "dashboard", "publish", "channel-performance",
}


@router.get("/export")
async def export_analytics(
    kind: str = Query(..., description=f"Export turu. Gecerli: {sorted(_KIND_TO_SERVICE.keys())}"),
    format: str = Query("csv", description="Sadece 'csv' destekleniyor."),
    window: str = Query(default="all_time"),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    channel_profile_id: Optional[str] = Query(default=None),
    platform: Optional[str] = Query(default=None),
    session=Depends(get_db),
    actor_id: Optional[str] = Depends(get_active_user_id),
):
    """
    Analytics export endpoint.

    Ayni filtre contract'i ile herhangi bir analytics report'unu
    CSV olarak indirir.
    """
    if kind not in _KIND_TO_SERVICE:
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz kind: '{kind}'. Gecerli: {sorted(_KIND_TO_SERVICE.keys())}",
        )
    if format != "csv":
        raise HTTPException(
            status_code=400,
            detail="Sadece format=csv destekleniyor.",
        )
    _validate_window(window)
    df = _parse_date(date_from, "date_from")
    dt = _parse_date(date_to, "date_to")

    fn_name = _KIND_TO_SERVICE[kind]
    fn = getattr(service, fn_name)
    kwargs = {
        "session": session,
        "window": window,
        "user_id": user_id,
        "channel_profile_id": channel_profile_id,
        "platform": platform,
    }
    if kind in _KIND_SUPPORTS_DATE_RANGE:
        kwargs["date_from"] = df
        kwargs["date_to"] = dt

    data = await fn(**kwargs)
    csv_text = export_service.to_csv(data, kind)

    await _audit_view(session, actor_id, f"export.{kind}",
                      window=window, date_from=date_from, date_to=date_to,
                      user_id=user_id, channel_profile_id=channel_profile_id, platform=platform,
                      extra={"format": format})

    filename = f"analytics_{kind}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
