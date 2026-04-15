"""
Analytics Servis Katmanı — M8-C1, M16, M17, M18, M37, M38, Dashboard V2.

Mevcut tablolardan salt okunur aggregation sorguları.
Şema değişikliği yok, migration yok, yazma yok.

Kural: Bu servis hiçbir zaman publish_service veya job_service
fonksiyonlarını çağırmaz. Doğrudan SELECT sorgularıyla çalışır.

Zaman filtresi:
  last_7d  : son 7 gün
  last_30d : son 30 gün
  last_90d : son 90 gün
  all_time : filtre yok

Tarih aralığı (M17):
  date_from / date_to : ISO datetime parametreleri ile kesin tarih aralığı.
  Zaman penceresi (window) ile birlikte kullanılabilir; date_from/date_to
  verilmişse window ignore edilir.

Provider error rate (M11):
  provider_error_rate — provider-dependent step'lerin başarısızlık oranı.
  Hangi step'lerin provider-dependent olduğu PROVIDER_STEP_KEYS sabiti
  ile tek noktadan yönetilir (M38 hardening).

Source impact (M17-A):
  Kaynak (source) bazlı aggregation: toplam kaynak, aktif kaynak,
  tarama sayısı, haber sayısı, kullanılan haber, bulletin sayısı.

Channel overview (M17-C):
  YouTube publish özet metrikleri: toplam publish, başarılı, başarısız,
  bağlantı durumu.

Provider cost model (M17-D):
  Provider bazlı maliyet görünürlüğü: actual/estimated/unsupported.

Entity filtering:
  user_id / channel_profile_id / platform — optional entity-level filters.
  Applied via _apply_entity_filters after time filters.
"""

import json as _json_module
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

_json_loads = _json_module.loads

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Job, JobStep, PublishRecord,
    NewsSource, SourceScan, NewsItem, UsedNewsRegistry, NewsBulletin,
    StandardVideo, Template, StyleBlueprint, TemplateStyleLink,
    ContentProject, ChannelProfile, PlatformConnection,
    SyncedComment, SyncedPlaylist, PlatformPost, EngagementTask,
)
from app.prompt_assembly.models import PromptAssemblyRun
from app.analytics.sql_helpers import epoch_diff_seconds

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider-dependent step keys — tek noktadan yönetim (M38)
# Yeni bir provider-dependent step eklendiğinde buraya eklenmeli.
# ---------------------------------------------------------------------------
PROVIDER_STEP_KEYS = ["script", "metadata", "tts", "visuals", "subtitle"]

# ---------------------------------------------------------------------------
# Render duration step key — tek noktadan yönetim (M38)
# Pipeline'da render süresi ölçülen adım.
# ---------------------------------------------------------------------------
RENDER_STEP_KEY = "composition"

# ---------------------------------------------------------------------------
# Zaman filtresi yardımcısı
# ---------------------------------------------------------------------------

_TIME_WINDOWS: dict = {
    "last_7d": timedelta(days=7),
    "last_30d": timedelta(days=30),
    "last_90d": timedelta(days=90),
    "all_time": None,
}


def _cutoff(window: str) -> Optional[datetime]:
    """Verilen pencere için UTC cutoff datetime döndürür; all_time için None."""
    if window not in _TIME_WINDOWS:
        raise ValueError(
            f"Geçersiz zaman penceresi: '{window}'. "
            f"Geçerli değerler: {list(_TIME_WINDOWS)}"
        )
    delta = _TIME_WINDOWS[window]
    if delta is None:
        return None
    return datetime.now(timezone.utc) - delta


# ---------------------------------------------------------------------------
# Entity filter yardımcısı
# ---------------------------------------------------------------------------

def _apply_entity_filters(
    q,
    *,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
    entity: str = "job",  # "job" | "publish" | "step"
):
    """Apply user/channel/platform filters to a query.

    For Job queries: filter via Job.channel_profile_id and ContentProject join for user_id.
    For PublishRecord queries: filter via PublishRecord → Job → ContentProject.
    For JobStep queries: filter via JobStep.job_id → Job → ContentProject.
    """
    if not any([user_id, channel_profile_id, platform]):
        return q

    if entity == "job":
        if channel_profile_id:
            q = q.where(Job.channel_profile_id == channel_profile_id)
        if user_id:
            user_project_ids = select(ContentProject.id).where(ContentProject.user_id == user_id)
            q = q.where(Job.content_project_id.in_(user_project_ids))
        # platform doesn't filter jobs directly
    elif entity == "publish":
        if platform:
            q = q.where(PublishRecord.platform == platform)
        if channel_profile_id:
            job_ids = select(Job.id).where(Job.channel_profile_id == channel_profile_id)
            q = q.where(PublishRecord.job_id.in_(job_ids))
        if user_id:
            user_project_ids = select(ContentProject.id).where(ContentProject.user_id == user_id)
            job_ids = select(Job.id).where(Job.content_project_id.in_(user_project_ids))
            q = q.where(PublishRecord.job_id.in_(job_ids))
    elif entity == "step":
        if channel_profile_id or user_id:
            job_filter = select(Job.id)
            if channel_profile_id:
                job_filter = job_filter.where(Job.channel_profile_id == channel_profile_id)
            if user_id:
                user_project_ids = select(ContentProject.id).where(ContentProject.user_id == user_id)
                job_filter = job_filter.where(Job.content_project_id.in_(user_project_ids))
            q = q.where(JobStep.job_id.in_(job_filter))
        # platform doesn't filter steps directly

    return q


# ---------------------------------------------------------------------------
# Overview metrikleri
# ---------------------------------------------------------------------------

async def get_overview_metrics(
    session: AsyncSession,
    window: str = "all_time",
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Platform genel metrikleri.

    Döndürülen alanlar:
      window                       : zaman penceresi
      total_job_count              : toplam job sayısı
      completed_job_count          : status='completed' job sayısı
      failed_job_count             : status='failed' job sayısı
      job_success_rate             : completed / total (None if total=0)
      total_publish_count          : toplam publish_records sayısı
      published_count              : status='published' kayıt sayısı
      failed_publish_count         : status='failed' kayıt sayısı
      publish_success_rate         : published / total_publish (None if total=0)
      avg_production_duration_seconds : ortalama job süresi (started_at→finished_at)
      retry_rate                   : retry_count > 0 olan job oranı (None if total=0)

    date_from/date_to verilmişse window cutoff'u yerine bunlar kullanılır.
    """
    # date_from/date_to öncelikli; yoksa window cutoff
    if date_from is not None or date_to is not None:
        cut = None  # date_from/date_to kullanılacak
    else:
        cut = _cutoff(window)

    # --- Job metrikleri ---
    job_q = select(
        func.count(Job.id).label("total"),
        func.sum(case((Job.status == "completed", 1), else_=0)).label("completed"),
        func.sum(case((Job.status == "failed", 1), else_=0)).label("failed"),
        func.sum(case((Job.retry_count > 0, 1), else_=0)).label("retried"),
        func.avg(
            case(
                (
                    (Job.started_at.is_not(None)) & (Job.finished_at.is_not(None)),
                    epoch_diff_seconds(Job.started_at, Job.finished_at),
                ),
                else_=None,
            )
        ).label("avg_duration"),
    )
    if date_from is not None:
        job_q = job_q.where(Job.created_at >= date_from)
    elif cut is not None:
        job_q = job_q.where(Job.created_at >= cut)
    if date_to is not None:
        job_q = job_q.where(Job.created_at <= date_to)
    job_q = _apply_entity_filters(job_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")

    job_row = (await session.execute(job_q)).one()

    total_jobs = job_row.total or 0
    completed_jobs = int(job_row.completed or 0)
    failed_jobs = int(job_row.failed or 0)
    retried_jobs = int(job_row.retried or 0)
    avg_production = (
        round(float(job_row.avg_duration), 2) if job_row.avg_duration is not None else None
    )
    job_success_rate = (
        round(completed_jobs / total_jobs, 4) if total_jobs > 0 else None
    )
    retry_rate = (
        round(retried_jobs / total_jobs, 4) if total_jobs > 0 else None
    )

    # --- Publish metrikleri ---
    pub_q = select(
        func.count(PublishRecord.id).label("total"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("published"),
        func.sum(case((PublishRecord.status == "failed", 1), else_=0)).label("failed"),
    )
    if date_from is not None:
        pub_q = pub_q.where(PublishRecord.created_at >= date_from)
    elif cut is not None:
        pub_q = pub_q.where(PublishRecord.created_at >= cut)
    if date_to is not None:
        pub_q = pub_q.where(PublishRecord.created_at <= date_to)
    pub_q = _apply_entity_filters(pub_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")

    pub_row = (await session.execute(pub_q)).one()

    total_publish = pub_row.total or 0
    published_count = int(pub_row.published or 0)
    failed_publish = int(pub_row.failed or 0)
    publish_success_rate = (
        round(published_count / total_publish, 4) if total_publish > 0 else None
    )

    # --- Review funnel (current state — no window filter) ---
    review_pending_q = select(
        func.count(PublishRecord.id).label("pending"),
    ).where(PublishRecord.status == "pending_review")
    review_pending_q = _apply_entity_filters(review_pending_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    review_pending_row = (await session.execute(review_pending_q)).one()
    review_pending_count = int(review_pending_row.pending or 0)

    publish_backlog_q = select(
        func.count(PublishRecord.id).label("backlog"),
    ).where(PublishRecord.status.in_(["approved", "scheduled"]))
    publish_backlog_q = _apply_entity_filters(publish_backlog_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    publish_backlog_row = (await session.execute(publish_backlog_q)).one()
    publish_backlog_count = int(publish_backlog_row.backlog or 0)

    # review_rejected is windowed
    review_rejected_q = select(
        func.count(PublishRecord.id).label("rejected"),
    ).where(PublishRecord.status == "review_rejected")
    if date_from is not None:
        review_rejected_q = review_rejected_q.where(PublishRecord.created_at >= date_from)
    elif cut is not None:
        review_rejected_q = review_rejected_q.where(PublishRecord.created_at >= cut)
    if date_to is not None:
        review_rejected_q = review_rejected_q.where(PublishRecord.created_at <= date_to)
    review_rejected_q = _apply_entity_filters(review_rejected_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    review_rejected_row = (await session.execute(review_rejected_q)).one()
    review_rejected_count = int(review_rejected_row.rejected or 0)

    return {
        "window": window,
        "total_job_count": total_jobs,
        "completed_job_count": completed_jobs,
        "failed_job_count": failed_jobs,
        "job_success_rate": job_success_rate,
        "total_publish_count": total_publish,
        "published_count": published_count,
        "failed_publish_count": failed_publish,
        "publish_success_rate": publish_success_rate,
        "avg_production_duration_seconds": avg_production,
        "retry_rate": retry_rate,
        "review_pending_count": review_pending_count,
        "review_rejected_count": review_rejected_count,
        "publish_backlog_count": publish_backlog_count,
    }


# ---------------------------------------------------------------------------
# Operations metrikleri
# ---------------------------------------------------------------------------

async def get_operations_metrics(
    session: AsyncSession,
    window: str = "all_time",
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Operasyonel metrikler.

    Döndürülen alanlar:
      window                        : zaman penceresi
      avg_render_duration_seconds   : composition step'lerin ortalama süresi.
      step_stats                    : step_key başına {count, avg_elapsed, failed_count}
      provider_error_rate           : Provider-dependent step'lerin başarısızlık oranı.
    """
    cut = _cutoff(window)

    # --- Composition step ortalama süresi (canonical render proxy) ---
    render_q = select(
        func.avg(JobStep.elapsed_seconds).label("avg_render"),
    ).where(JobStep.step_key == RENDER_STEP_KEY)
    if cut is not None:
        render_q = render_q.where(JobStep.created_at >= cut)
    render_q = _apply_entity_filters(render_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="step")

    render_row = (await session.execute(render_q)).one()
    avg_render = (
        round(float(render_row.avg_render), 2)
        if render_row.avg_render is not None
        else None
    )

    # --- Step bazlı istatistikler ---
    step_q = select(
        JobStep.step_key,
        func.count(JobStep.id).label("count"),
        func.avg(JobStep.elapsed_seconds).label("avg_elapsed"),
        func.sum(case((JobStep.status == "failed", 1), else_=0)).label("failed_count"),
    ).group_by(JobStep.step_key)
    if cut is not None:
        step_q = step_q.where(JobStep.created_at >= cut)
    step_q = _apply_entity_filters(step_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="step")

    step_rows = (await session.execute(step_q)).all()
    step_stats = [
        {
            "step_key": row.step_key,
            "count": row.count,
            "avg_elapsed_seconds": (
                round(float(row.avg_elapsed), 2) if row.avg_elapsed is not None else None
            ),
            "failed_count": int(row.failed_count or 0),
        }
        for row in step_rows
    ]

    # --- Provider error rate (M11) ---
    provider_step_q = select(
        func.count(JobStep.id).label("total"),
        func.sum(case((JobStep.status == "failed", 1), else_=0)).label("failed"),
    ).where(JobStep.step_key.in_(PROVIDER_STEP_KEYS))
    if cut is not None:
        provider_step_q = provider_step_q.where(JobStep.created_at >= cut)
    provider_step_q = _apply_entity_filters(provider_step_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="step")

    provider_row = (await session.execute(provider_step_q)).one()
    provider_total = provider_row.total or 0
    provider_failed = int(provider_row.failed or 0)
    provider_error_rate = (
        round(provider_failed / provider_total, 4) if provider_total > 0 else None
    )

    # --- Provider bazlı özet (M16) ---
    provider_trace_q = select(
        JobStep.step_key,
        JobStep.provider_trace_json,
        JobStep.status,
        JobStep.elapsed_seconds,
    ).where(
        JobStep.step_key.in_(PROVIDER_STEP_KEYS),
        JobStep.provider_trace_json.is_not(None),
    )
    if cut is not None:
        provider_trace_q = provider_trace_q.where(JobStep.created_at >= cut)
    provider_trace_q = _apply_entity_filters(provider_trace_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="step")

    trace_rows = (await session.execute(provider_trace_q)).all()

    # Provider bazlı aggregation — M23-B: gözlemlenebilir trace parsing
    provider_summary: dict[str, dict] = {}
    _trace_total = len(trace_rows)
    _trace_empty = 0
    _trace_parse_errors = 0
    _trace_invalid_structure = 0
    _trace_unknown_provider = 0

    for row in trace_rows:
        trace_json = row.provider_trace_json
        if not trace_json:
            _trace_empty += 1
            continue
        try:
            parsed = _json_loads(trace_json)
        except Exception as exc:
            _trace_parse_errors += 1
            logger.warning(
                "Analytics: provider_trace_json parse hatası (step_id=%s): %s",
                getattr(row, "id", "?"), str(exc)[:120],
            )
            continue

        # Trace, result dict'in içinde "provider_trace" altında olabilir
        trace = parsed.get("provider_trace", parsed) if isinstance(parsed, dict) else {}
        if not isinstance(trace, dict):
            _trace_invalid_structure += 1
            continue

        pname = trace.get("provider_name", row.step_key)
        pkind = trace.get("provider_kind")
        if not pkind:
            _trace_unknown_provider += 1
            pkind = "unknown"

        if pname not in provider_summary:
            provider_summary[pname] = {
                "provider_name": pname,
                "provider_kind": pkind,
                "total_calls": 0,
                "failed_calls": 0,
                "total_latency_ms": 0.0,
                "latency_count": 0,
                "total_estimated_cost_usd": 0.0,
                "total_input_tokens": 0,
                "total_output_tokens": 0,
            }

        s = provider_summary[pname]
        s["total_calls"] += 1

        if trace.get("success") is False or row.status == "failed":
            s["failed_calls"] += 1

        latency = trace.get("latency_ms")
        if latency is not None:
            s["total_latency_ms"] += float(latency)
            s["latency_count"] += 1

        cost = trace.get("cost_usd_estimate")
        if cost is not None:
            s["total_estimated_cost_usd"] += float(cost)

        in_tok = trace.get("input_tokens")
        if in_tok is not None:
            s["total_input_tokens"] += int(in_tok)

        out_tok = trace.get("output_tokens")
        if out_tok is not None:
            s["total_output_tokens"] += int(out_tok)

    # Özet listesi oluştur
    provider_stats = []
    for pname, s in provider_summary.items():
        avg_lat = (
            round(s["total_latency_ms"] / s["latency_count"], 1)
            if s["latency_count"] > 0 else None
        )
        err_rate = (
            round(s["failed_calls"] / s["total_calls"], 4)
            if s["total_calls"] > 0 else None
        )
        provider_stats.append({
            "provider_name": s["provider_name"],
            "provider_kind": s["provider_kind"],
            "total_calls": s["total_calls"],
            "failed_calls": s["failed_calls"],
            "error_rate": err_rate,
            "avg_latency_ms": avg_lat,
            "total_estimated_cost_usd": (
                round(s["total_estimated_cost_usd"], 4)
                if s["total_estimated_cost_usd"] > 0 else None
            ),
            "total_input_tokens": s["total_input_tokens"] or None,
            "total_output_tokens": s["total_output_tokens"] or None,
        })

    # M23-B: Data quality metriği logu
    if _trace_parse_errors or _trace_invalid_structure:
        logger.warning(
            "Analytics trace veri kalitesi: total=%d, empty=%d, parse_error=%d, "
            "invalid_structure=%d, unknown_provider=%d",
            _trace_total, _trace_empty, _trace_parse_errors,
            _trace_invalid_structure, _trace_unknown_provider,
        )

    # --- Prompt Assembly counts ---
    assembly_prod_q = select(
        func.count(PromptAssemblyRun.id).label("total"),
    ).where(PromptAssemblyRun.is_dry_run.is_(False))
    if cut is not None:
        assembly_prod_q = assembly_prod_q.where(PromptAssemblyRun.created_at >= cut)
    assembly_prod_row = (await session.execute(assembly_prod_q)).one()
    total_assembly_runs = int(assembly_prod_row.total or 0)

    assembly_dry_q = select(
        func.count(PromptAssemblyRun.id).label("total"),
    ).where(PromptAssemblyRun.is_dry_run.is_(True))
    if cut is not None:
        assembly_dry_q = assembly_dry_q.where(PromptAssemblyRun.created_at >= cut)
    assembly_dry_row = (await session.execute(assembly_dry_q)).one()
    dry_run_count = int(assembly_dry_row.total or 0)

    return {
        "window": window,
        "avg_render_duration_seconds": avg_render,
        "step_stats": step_stats,
        "provider_error_rate": provider_error_rate,
        "provider_stats": provider_stats,
        "trace_data_quality": {
            "total_traces": _trace_total,
            "empty_traces": _trace_empty,
            "parse_errors": _trace_parse_errors,
            "invalid_structure": _trace_invalid_structure,
            "unknown_provider_count": _trace_unknown_provider,
            "valid_traces": _trace_total - _trace_empty - _trace_parse_errors - _trace_invalid_structure,
        },
        "total_assembly_runs": total_assembly_runs,
        "dry_run_count": dry_run_count,
    }


# ---------------------------------------------------------------------------
# Source impact metrikleri (M17-A)
# ---------------------------------------------------------------------------

async def get_source_impact_metrics(
    session: AsyncSession,
    window: str = "all_time",
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Kaynak bazlı etki metrikleri.

    Note: source-impact is primarily about news sources, not directly
    filterable by user/channel/platform. The params are accepted for
    API consistency but currently have no effect on source-level queries.
    """
    cut = _cutoff(window)

    # --- Toplam kaynak ---
    src_q = select(
        func.count(NewsSource.id).label("total"),
        func.sum(case((NewsSource.status == "active", 1), else_=0)).label("active"),
    )
    src_row = (await session.execute(src_q)).one()
    total_sources = src_row.total or 0
    active_sources = int(src_row.active or 0)

    # --- Tarama metrikleri ---
    scan_q = select(
        func.count(SourceScan.id).label("total"),
        func.sum(case((SourceScan.status == "completed", 1), else_=0)).label("completed"),
    )
    if cut is not None:
        scan_q = scan_q.where(SourceScan.created_at >= cut)
    scan_row = (await session.execute(scan_q)).one()
    total_scans = scan_row.total or 0
    successful_scans = int(scan_row.completed or 0)

    # --- Haber öğeleri ---
    news_q = select(func.count(NewsItem.id).label("total"))
    if cut is not None:
        news_q = news_q.where(NewsItem.created_at >= cut)
    news_row = (await session.execute(news_q)).one()
    total_news_items = news_row.total or 0

    # --- Kullanılan haberler ---
    used_q = select(func.count(UsedNewsRegistry.id).label("total"))
    if cut is not None:
        used_q = used_q.where(UsedNewsRegistry.created_at >= cut)
    used_row = (await session.execute(used_q)).one()
    used_news_count = used_row.total or 0

    # --- Bulletin sayısı ---
    bulletin_q = select(func.count(NewsBulletin.id).label("total"))
    if cut is not None:
        bulletin_q = bulletin_q.where(NewsBulletin.created_at >= cut)
    bulletin_row = (await session.execute(bulletin_q)).one()
    bulletin_count = bulletin_row.total or 0

    # --- Kaynak bazlı detaylı istatistikler ---
    source_detail_q = (
        select(
            NewsSource.id,
            NewsSource.name,
            NewsSource.source_type,
            NewsSource.status,
            func.count(func.distinct(SourceScan.id)).label("scan_count"),
            func.count(func.distinct(NewsItem.id)).label("news_count"),
        )
        .outerjoin(SourceScan, SourceScan.source_id == NewsSource.id)
        .outerjoin(NewsItem, NewsItem.source_id == NewsSource.id)
        .group_by(NewsSource.id)
    )
    source_rows = (await session.execute(source_detail_q)).all()

    source_stats = []
    for row in source_rows:
        used_from_source_q = (
            select(func.count(UsedNewsRegistry.id))
            .join(NewsItem, NewsItem.id == UsedNewsRegistry.news_item_id)
            .where(NewsItem.source_id == row.id)
        )
        used_from_source = (await session.execute(used_from_source_q)).scalar() or 0

        source_stats.append({
            "source_id": row.id,
            "source_name": row.name,
            "source_type": row.source_type,
            "status": row.status,
            "scan_count": row.scan_count or 0,
            "news_count": row.news_count or 0,
            "used_news_count": used_from_source,
        })

    return {
        "window": window,
        "total_sources": total_sources,
        "active_sources": active_sources,
        "total_scans": total_scans,
        "successful_scans": successful_scans,
        "total_news_items": total_news_items,
        "used_news_count": used_news_count,
        "bulletin_count": bulletin_count,
        "source_stats": source_stats,
    }


# ---------------------------------------------------------------------------
# Channel overview metrikleri (M17-C)
# ---------------------------------------------------------------------------

async def get_channel_overview_metrics(
    session: AsyncSession,
    window: str = "all_time",
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Kanal bazlı yayın özet metrikleri.

    YouTube publish kayıtlarından gerçek aggregation.
    """
    cut = _cutoff(window)

    # YouTube publish kayıtları
    yt_q = select(
        func.count(PublishRecord.id).label("total"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("published"),
        func.sum(case((PublishRecord.status == "failed", 1), else_=0)).label("failed"),
        func.sum(case((PublishRecord.status == "draft", 1), else_=0)).label("draft"),
        func.sum(
            case(
                (PublishRecord.status.in_(["pending_review", "approved", "scheduled", "publishing"]), 1),
                else_=0,
            )
        ).label("in_progress"),
        func.max(PublishRecord.published_at).label("last_published_at"),
    ).where(PublishRecord.platform == "youtube")
    if cut is not None:
        yt_q = yt_q.where(PublishRecord.created_at >= cut)
    yt_q = _apply_entity_filters(yt_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")

    yt_row = (await session.execute(yt_q)).one()

    total_yt = yt_row.total or 0
    published_yt = int(yt_row.published or 0)
    failed_yt = int(yt_row.failed or 0)
    draft_yt = int(yt_row.draft or 0)
    in_progress_yt = int(yt_row.in_progress or 0)
    last_published_at = str(yt_row.last_published_at) if yt_row.last_published_at else None

    has_publish_history = total_yt > 0

    return {
        "window": window,
        "youtube": {
            "total_publish_attempts": total_yt,
            "published_count": published_yt,
            "failed_count": failed_yt,
            "draft_count": draft_yt,
            "in_progress_count": in_progress_yt,
            "publish_success_rate": (
                round(published_yt / total_yt, 4) if total_yt > 0 else None
            ),
            "last_published_at": last_published_at,
            "has_publish_history": has_publish_history,
        },
    }


# ---------------------------------------------------------------------------
# Content analytics metrikleri (M18-A)
# ---------------------------------------------------------------------------

async def get_content_metrics(
    session: AsyncSession,
    window: str = "all_time",
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    İçerik düzeyinde analytics metrikleri.
    """
    # date_from/date_to öncelikli
    if date_from is not None or date_to is not None:
        cut = None
    else:
        cut = _cutoff(window)

    def _apply_time_filter(q, col):
        if date_from is not None:
            q = q.where(col >= date_from)
        elif cut is not None:
            q = q.where(col >= cut)
        if date_to is not None:
            q = q.where(col <= date_to)
        return q

    # --- Modül dağılımı (Job.module_type bazında) ---
    module_q = select(
        Job.module_type,
        func.count(Job.id).label("total"),
        func.sum(case((Job.status == "completed", 1), else_=0)).label("completed"),
        func.sum(case((Job.status == "failed", 1), else_=0)).label("failed"),
        func.sum(case((Job.retry_count > 0, 1), else_=0)).label("retried"),
        func.avg(
            case(
                (
                    (Job.started_at.is_not(None)) & (Job.finished_at.is_not(None)),
                    epoch_diff_seconds(Job.started_at, Job.finished_at),
                ),
                else_=None,
            )
        ).label("avg_prod_duration"),
    ).where(Job.module_type.is_not(None)).group_by(Job.module_type)
    module_q = _apply_time_filter(module_q, Job.created_at)
    module_q = _apply_entity_filters(module_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")

    module_rows = (await session.execute(module_q)).all()

    # Per-module avg render duration from composition steps
    render_by_module_q = (
        select(
            Job.module_type,
            func.avg(JobStep.elapsed_seconds).label("avg_render"),
        )
        .join(Job, Job.id == JobStep.job_id)
        .where(JobStep.step_key == RENDER_STEP_KEY, Job.module_type.is_not(None))
        .group_by(Job.module_type)
    )
    render_by_module_q = _apply_time_filter(render_by_module_q, JobStep.created_at)
    render_by_module_q = _apply_entity_filters(render_by_module_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="step")
    render_by_module_rows = (await session.execute(render_by_module_q)).all()
    render_by_module = {r.module_type: r.avg_render for r in render_by_module_rows}

    module_distribution = []
    for row in module_rows:
        total = row.total or 0
        completed = int(row.completed or 0)
        failed = int(row.failed or 0)
        retried = int(row.retried or 0)
        avg_prod = (
            round(float(row.avg_prod_duration), 2)
            if row.avg_prod_duration is not None else None
        )
        avg_render_mod = render_by_module.get(row.module_type)
        avg_render_val = (
            round(float(avg_render_mod), 2) if avg_render_mod is not None else None
        )
        module_distribution.append({
            "module_type": row.module_type,
            "total_jobs": total,
            "completed_jobs": completed,
            "failed_jobs": failed,
            "success_rate": round(completed / total, 4) if total > 0 else None,
            "avg_production_duration_seconds": avg_prod,
            "avg_render_duration_seconds": avg_render_val,
            "retry_rate": round(retried / total, 4) if total > 0 else None,
        })

    # --- İçerik çıktı sayıları ---
    sv_q = select(func.count(StandardVideo.id).label("total"))
    sv_q = _apply_time_filter(sv_q, StandardVideo.created_at)
    sv_count = (await session.execute(sv_q)).scalar() or 0

    nb_q = select(func.count(NewsBulletin.id).label("total"))
    nb_q = _apply_time_filter(nb_q, NewsBulletin.created_at)
    nb_count = (await session.execute(nb_q)).scalar() or 0

    content_output_count = sv_count + nb_count

    # --- Yayınlanan içerik sayısı ---
    pub_q = select(func.count(PublishRecord.id).label("total")).where(
        PublishRecord.status == "published"
    )
    pub_q = _apply_time_filter(pub_q, PublishRecord.created_at)
    pub_q = _apply_entity_filters(pub_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    published_content_count = (await session.execute(pub_q)).scalar() or 0

    # --- Ortalama yayına kadar geçen süre ---
    time_to_pub_q = select(
        func.avg(
            epoch_diff_seconds(Job.created_at, PublishRecord.published_at),
        ).label("avg_time")
    ).join(Job, Job.id == PublishRecord.job_id).where(
        PublishRecord.status == "published",
        PublishRecord.published_at.is_not(None),
        Job.created_at.is_not(None),
    )
    time_to_pub_q = _apply_time_filter(time_to_pub_q, PublishRecord.created_at)
    time_to_pub_q = _apply_entity_filters(time_to_pub_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    avg_time_to_publish = (await session.execute(time_to_pub_q)).scalar()
    avg_time_to_publish = (
        round(float(avg_time_to_publish), 2)
        if avg_time_to_publish is not None
        else None
    )

    # --- İçerik tipi kırılımı ---
    content_type_breakdown = [
        {"type": "standard_video", "count": sv_count},
        {"type": "news_bulletin", "count": nb_count},
    ]

    # --- Template kullanım sayısı ---
    tpl_q = select(func.count(Template.id).label("total")).where(
        Template.status == "active"
    )
    active_template_count = (await session.execute(tpl_q)).scalar() or 0

    # --- Style Blueprint kullanım sayısı ---
    bp_q = select(func.count(StyleBlueprint.id).label("total")).where(
        StyleBlueprint.status == "active"
    )
    active_blueprint_count = (await session.execute(bp_q)).scalar() or 0

    return {
        "window": window,
        "module_distribution": module_distribution,
        "content_output_count": content_output_count,
        "published_content_count": published_content_count,
        "avg_time_to_publish_seconds": avg_time_to_publish,
        "content_type_breakdown": content_type_breakdown,
        "active_template_count": active_template_count,
        "active_blueprint_count": active_blueprint_count,
    }


# ---------------------------------------------------------------------------
# Template impact metrikleri (Faz G)
# ---------------------------------------------------------------------------

async def get_template_impact_metrics(
    session: AsyncSession,
    window: str = "all_time",
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Per-template and per-blueprint job success rates and avg durations.

    Joins Job table with template_id (direct column on Job),
    then to Template and StyleBlueprint tables via TemplateStyleLink.
    """
    cut = _cutoff(window)

    # --- Per-template stats ---
    tpl_q = (
        select(
            Job.template_id,
            Template.name.label("template_name"),
            func.count(Job.id).label("total"),
            func.sum(case((Job.status == "completed", 1), else_=0)).label("completed"),
            func.sum(case((Job.status == "failed", 1), else_=0)).label("failed"),
            func.avg(
                case(
                    (
                        (Job.started_at.is_not(None)) & (Job.finished_at.is_not(None)),
                        epoch_diff_seconds(Job.started_at, Job.finished_at),
                    ),
                    else_=None,
                )
            ).label("avg_duration"),
        )
        .outerjoin(Template, Template.id == Job.template_id)
        .where(Job.template_id.is_not(None))
        .group_by(Job.template_id)
    )
    if cut is not None:
        tpl_q = tpl_q.where(Job.created_at >= cut)
    tpl_q = _apply_entity_filters(tpl_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")

    tpl_rows = (await session.execute(tpl_q)).all()

    template_stats = []
    for row in tpl_rows:
        total = row.total or 0
        completed = int(row.completed or 0)
        failed = int(row.failed or 0)
        avg_dur = (
            round(float(row.avg_duration), 2)
            if row.avg_duration is not None else None
        )
        template_stats.append({
            "template_id": row.template_id,
            "template_name": row.template_name,
            "total_jobs": total,
            "completed_jobs": completed,
            "failed_jobs": failed,
            "success_rate": round(completed / total, 4) if total > 0 else None,
            "avg_production_duration_seconds": avg_dur,
        })

    # --- Per-blueprint stats ---
    bp_q = (
        select(
            TemplateStyleLink.style_blueprint_id.label("blueprint_id"),
            StyleBlueprint.name.label("blueprint_name"),
            func.count(func.distinct(Job.id)).label("total"),
            func.sum(case((Job.status == "completed", 1), else_=0)).label("completed"),
        )
        .join(TemplateStyleLink, TemplateStyleLink.template_id == Job.template_id)
        .join(StyleBlueprint, StyleBlueprint.id == TemplateStyleLink.style_blueprint_id)
        .where(Job.template_id.is_not(None))
        .group_by(TemplateStyleLink.style_blueprint_id)
    )
    if cut is not None:
        bp_q = bp_q.where(Job.created_at >= cut)
    bp_q = _apply_entity_filters(bp_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")

    bp_rows = (await session.execute(bp_q)).all()

    blueprint_stats = []
    for row in bp_rows:
        total = row.total or 0
        completed = int(row.completed or 0)
        blueprint_stats.append({
            "blueprint_id": row.blueprint_id,
            "blueprint_name": row.blueprint_name,
            "total_jobs": total,
            "completed_jobs": completed,
            "success_rate": round(completed / total, 4) if total > 0 else None,
        })

    return {
        "window": window,
        "template_stats": template_stats,
        "blueprint_stats": blueprint_stats,
    }


# ---------------------------------------------------------------------------
# Prompt Assembly metrikleri (M37)
# ---------------------------------------------------------------------------

async def get_prompt_assembly_metrics(
    session: AsyncSession,
    window: str = "all_time",
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Prompt Assembly çalışma metrikleri.

    Note: PromptAssemblyRun is not directly linked to Job/ContentProject,
    so user_id/channel_profile_id/platform filters are accepted for API
    consistency but currently have no effect on assembly-level queries.
    """
    if date_from is not None or date_to is not None:
        cut = None
    else:
        cut = _cutoff(window)

    def _apply_time_filter(q, col):
        if date_from is not None:
            q = q.where(col >= date_from)
        elif cut is not None:
            q = q.where(col >= cut)
        if date_to is not None:
            q = q.where(col <= date_to)
        return q

    # --- Toplam sayılar ---
    totals_q = select(
        func.count(PromptAssemblyRun.id).label("total"),
        func.sum(case((PromptAssemblyRun.is_dry_run.is_(True), 1), else_=0)).label("dry"),
        func.sum(case((PromptAssemblyRun.is_dry_run.is_(False), 1), else_=0)).label("prod"),
        func.avg(PromptAssemblyRun.block_count_included).label("avg_included"),
        func.avg(PromptAssemblyRun.block_count_skipped).label("avg_skipped"),
    )
    totals_q = _apply_time_filter(totals_q, PromptAssemblyRun.created_at)
    totals_row = (await session.execute(totals_q)).one()

    total_runs = int(totals_row.total or 0)
    dry_runs = int(totals_row.dry or 0)
    prod_runs = int(totals_row.prod or 0)
    avg_included = round(float(totals_row.avg_included), 2) if totals_row.avg_included is not None else 0.0
    avg_skipped = round(float(totals_row.avg_skipped), 2) if totals_row.avg_skipped is not None else 0.0

    # --- Modül bazlı istatistikler ---
    module_q = select(
        PromptAssemblyRun.module_scope,
        func.count(PromptAssemblyRun.id).label("run_count"),
        func.avg(PromptAssemblyRun.block_count_included).label("avg_included"),
        func.avg(PromptAssemblyRun.block_count_skipped).label("avg_skipped"),
    ).group_by(PromptAssemblyRun.module_scope)
    module_q = _apply_time_filter(module_q, PromptAssemblyRun.created_at)
    module_rows = (await session.execute(module_q)).all()

    module_stats = [
        {
            "module_scope": row.module_scope,
            "run_count": int(row.run_count or 0),
            "avg_included_blocks": round(float(row.avg_included), 2) if row.avg_included is not None else 0.0,
            "avg_skipped_blocks": round(float(row.avg_skipped), 2) if row.avg_skipped is not None else 0.0,
        }
        for row in module_rows
    ]

    # --- Provider bazlı istatistikler ---
    provider_q = select(
        PromptAssemblyRun.provider_name,
        func.count(PromptAssemblyRun.id).label("run_count"),
        func.sum(
            case((PromptAssemblyRun.provider_response_json.is_not(None), 1), else_=0)
        ).label("response_received"),
        func.sum(
            case((PromptAssemblyRun.provider_error_json.is_not(None), 1), else_=0)
        ).label("error_count"),
    ).group_by(PromptAssemblyRun.provider_name)
    provider_q = _apply_time_filter(provider_q, PromptAssemblyRun.created_at)
    provider_rows = (await session.execute(provider_q)).all()

    provider_stats = [
        {
            "provider_name": row.provider_name,
            "run_count": int(row.run_count or 0),
            "response_received_count": int(row.response_received or 0),
            "error_count": int(row.error_count or 0),
        }
        for row in provider_rows
    ]

    return {
        "window": window,
        "total_assembly_runs": total_runs,
        "dry_run_count": dry_runs,
        "production_run_count": prod_runs,
        "avg_included_blocks": avg_included,
        "avg_skipped_blocks": avg_skipped,
        "module_stats": module_stats,
        "provider_stats": provider_stats,
    }


# ---------------------------------------------------------------------------
# Dashboard Summary (Admin Dashboard V2)
# ---------------------------------------------------------------------------

async def get_dashboard_summary(
    session: AsyncSession,
    window: str = "last_30d",
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Admin Dashboard V2 aggregated summary.

    KPI'lar, gunluk trend, modul dagilimi, platform dagilimi,
    kuyruk durumu ve son hatalar.
    """
    if date_from is not None or date_to is not None:
        cut = None
    else:
        cut = _cutoff(window)

    def _apply_time(q, col):
        if date_from is not None:
            q = q.where(col >= date_from)
        elif cut is not None:
            q = q.where(col >= cut)
        if date_to is not None:
            q = q.where(col <= date_to)
        return q

    filters_applied = {}
    if user_id:
        filters_applied["user_id"] = user_id
    if channel_profile_id:
        filters_applied["channel_profile_id"] = channel_profile_id
    if platform:
        filters_applied["platform"] = platform

    # --- KPI: Projects ---
    project_q = select(func.count(ContentProject.id).label("total"))
    if user_id:
        project_q = project_q.where(ContentProject.user_id == user_id)
    if channel_profile_id:
        project_q = project_q.where(ContentProject.channel_profile_id == channel_profile_id)
    total_projects = (await session.execute(project_q)).scalar() or 0

    # --- KPI: Jobs ---
    job_q = select(
        func.count(Job.id).label("total"),
        func.sum(case((Job.status.in_(["pending", "running"]), 1), else_=0)).label("active"),
        func.sum(case((Job.status == "failed", 1), else_=0)).label("failed"),
        func.sum(case((Job.retry_count > 0, 1), else_=0)).label("retried"),
        func.avg(
            case(
                (
                    (Job.started_at.is_not(None)) & (Job.finished_at.is_not(None)),
                    epoch_diff_seconds(Job.started_at, Job.finished_at),
                ),
                else_=None,
            )
        ).label("avg_duration"),
    )
    job_q = _apply_time(job_q, Job.created_at)
    job_q = _apply_entity_filters(job_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")
    job_row = (await session.execute(job_q)).one()

    total_jobs = job_row.total or 0
    active_jobs = int(job_row.active or 0)
    failed_job_count = int(job_row.failed or 0)
    retried_jobs = int(job_row.retried or 0)
    avg_production = (
        round(float(job_row.avg_duration), 2) if job_row.avg_duration is not None else None
    )
    retry_rate = round(retried_jobs / total_jobs, 4) if total_jobs > 0 else None

    # --- KPI: Publish ---
    pub_q = select(
        func.count(PublishRecord.id).label("total"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("published"),
    )
    pub_q = _apply_time(pub_q, PublishRecord.created_at)
    pub_q = _apply_entity_filters(pub_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    pub_row = (await session.execute(pub_q)).one()
    total_publish = pub_row.total or 0
    published_count = int(pub_row.published or 0)
    publish_success_rate = round(published_count / total_publish, 4) if total_publish > 0 else None

    # --- Queue size (current pending/running jobs, no time filter) ---
    queue_q = select(func.count(Job.id).label("total")).where(
        Job.status.in_(["pending", "running"])
    )
    queue_q = _apply_entity_filters(queue_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")
    queue_size = (await session.execute(queue_q)).scalar() or 0

    # --- Recent errors (last 5 failed jobs) ---
    error_q = (
        select(Job.id, Job.module_type, Job.last_error, Job.created_at)
        .where(Job.status == "failed")
        .order_by(Job.created_at.desc())
        .limit(5)
    )
    error_q = _apply_entity_filters(error_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")
    error_rows = (await session.execute(error_q)).all()
    recent_errors = [
        {
            "job_id": row.id,
            "module_type": row.module_type,
            "last_error": row.last_error,
            "created_at": str(row.created_at) if row.created_at else None,
        }
        for row in error_rows
    ]

    # --- Daily trend (last 30 days or window) ---
    # Job trend
    job_trend_q = select(
        func.date(Job.created_at).label("day"),
        func.count(Job.id).label("job_count"),
        func.sum(case((Job.status == "completed", 1), else_=0)).label("completed_count"),
        func.sum(case((Job.status == "failed", 1), else_=0)).label("failed_count"),
    ).group_by(func.date(Job.created_at)).order_by(func.date(Job.created_at))
    job_trend_q = _apply_time(job_trend_q, Job.created_at)
    job_trend_q = _apply_entity_filters(job_trend_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")
    job_trend_rows = (await session.execute(job_trend_q)).all()

    # Publish trend (same window)
    pub_trend_q = select(
        func.date(PublishRecord.created_at).label("day"),
        func.count(PublishRecord.id).label("publish_count"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("publish_success_count"),
    ).group_by(func.date(PublishRecord.created_at)).order_by(func.date(PublishRecord.created_at))
    pub_trend_q = _apply_time(pub_trend_q, PublishRecord.created_at)
    pub_trend_q = _apply_entity_filters(pub_trend_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    pub_trend_rows = (await session.execute(pub_trend_q)).all()

    # Merge job + publish trends by date
    trend_map: dict[str, dict] = {}
    for row in job_trend_rows:
        day = str(row.day)
        trend_map[day] = {
            "date": day,
            "job_count": row.job_count or 0,
            "completed_count": int(row.completed_count or 0),
            "failed_count": int(row.failed_count or 0),
            "publish_count": 0,
            "publish_success_count": 0,
        }
    for row in pub_trend_rows:
        day = str(row.day)
        if day not in trend_map:
            trend_map[day] = {
                "date": day,
                "job_count": 0,
                "completed_count": 0,
                "failed_count": 0,
                "publish_count": 0,
                "publish_success_count": 0,
            }
        trend_map[day]["publish_count"] = row.publish_count or 0
        trend_map[day]["publish_success_count"] = int(row.publish_success_count or 0)

    daily_trend = sorted(trend_map.values(), key=lambda x: x["date"])

    # --- Module distribution ---
    mod_q = select(
        Job.module_type,
        func.count(Job.id).label("total"),
        func.sum(case((Job.status == "completed", 1), else_=0)).label("completed"),
        func.sum(case((Job.status == "failed", 1), else_=0)).label("failed"),
    ).where(Job.module_type.is_not(None)).group_by(Job.module_type)
    mod_q = _apply_time(mod_q, Job.created_at)
    mod_q = _apply_entity_filters(mod_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="job")
    mod_rows = (await session.execute(mod_q)).all()

    module_distribution = [
        {
            "module_type": row.module_type,
            "total_jobs": row.total or 0,
            "completed_jobs": int(row.completed or 0),
            "failed_jobs": int(row.failed or 0),
            "success_rate": round(int(row.completed or 0) / (row.total or 1), 4) if (row.total or 0) > 0 else None,
        }
        for row in mod_rows
    ]

    # --- Platform distribution ---
    plat_q = select(
        PublishRecord.platform,
        func.count(PublishRecord.id).label("total"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("published"),
        func.sum(case((PublishRecord.status == "failed", 1), else_=0)).label("failed"),
    ).group_by(PublishRecord.platform)
    plat_q = _apply_time(plat_q, PublishRecord.created_at)
    plat_q = _apply_entity_filters(plat_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    plat_rows = (await session.execute(plat_q)).all()

    platform_distribution = [
        {
            "platform": row.platform,
            "total": row.total or 0,
            "published": int(row.published or 0),
            "failed": int(row.failed or 0),
        }
        for row in plat_rows
    ]

    return {
        "window": window,
        "total_projects": total_projects,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_publish": total_publish,
        "publish_success_rate": publish_success_rate,
        "avg_production_duration_seconds": avg_production,
        "retry_rate": retry_rate,
        "failed_job_count": failed_job_count,
        "queue_size": queue_size,
        "recent_errors": recent_errors,
        "daily_trend": daily_trend,
        "module_distribution": module_distribution,
        "platform_distribution": platform_distribution,
        "filters_applied": filters_applied,
    }


# ---------------------------------------------------------------------------
# Publish Analytics
# ---------------------------------------------------------------------------

async def get_publish_analytics(
    session: AsyncSession,
    window: str = "last_30d",
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Publish-specific analytics.

    Platform kirilimi, gunluk publish trendi, basari orani.
    """
    if date_from is not None or date_to is not None:
        cut = None
    else:
        cut = _cutoff(window)

    def _apply_time(q, col):
        if date_from is not None:
            q = q.where(col >= date_from)
        elif cut is not None:
            q = q.where(col >= cut)
        if date_to is not None:
            q = q.where(col <= date_to)
        return q

    filters_applied = {}
    if user_id:
        filters_applied["user_id"] = user_id
    if channel_profile_id:
        filters_applied["channel_profile_id"] = channel_profile_id
    if platform:
        filters_applied["platform"] = platform

    # --- Main publish metrics ---
    main_q = select(
        func.count(PublishRecord.id).label("total"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("published"),
        func.sum(case((PublishRecord.status == "failed", 1), else_=0)).label("failed"),
        func.sum(case((PublishRecord.status == "draft", 1), else_=0)).label("draft"),
        func.sum(case((PublishRecord.status == "pending_review", 1), else_=0)).label("in_review"),
        func.sum(case((PublishRecord.status == "scheduled", 1), else_=0)).label("scheduled"),
    )
    main_q = _apply_time(main_q, PublishRecord.created_at)
    main_q = _apply_entity_filters(main_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    main_row = (await session.execute(main_q)).one()

    total_publish = main_row.total or 0
    published_count = int(main_row.published or 0)
    failed_count = int(main_row.failed or 0)
    draft_count = int(main_row.draft or 0)
    in_review_count = int(main_row.in_review or 0)
    scheduled_count = int(main_row.scheduled or 0)
    publish_success_rate = round(published_count / total_publish, 4) if total_publish > 0 else None

    # --- Avg time to publish ---
    time_q = select(
        func.avg(
            epoch_diff_seconds(Job.created_at, PublishRecord.published_at),
        ).label("avg_time")
    ).join(Job, Job.id == PublishRecord.job_id).where(
        PublishRecord.status == "published",
        PublishRecord.published_at.is_not(None),
        Job.created_at.is_not(None),
    )
    time_q = _apply_time(time_q, PublishRecord.created_at)
    time_q = _apply_entity_filters(time_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    avg_time_to_publish = (await session.execute(time_q)).scalar()
    avg_time_to_publish = (
        round(float(avg_time_to_publish), 2)
        if avg_time_to_publish is not None
        else None
    )

    # --- Platform breakdown ---
    plat_q = select(
        PublishRecord.platform,
        func.count(PublishRecord.id).label("total"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("published"),
        func.sum(case((PublishRecord.status == "failed", 1), else_=0)).label("failed"),
    ).group_by(PublishRecord.platform)
    plat_q = _apply_time(plat_q, PublishRecord.created_at)
    plat_q = _apply_entity_filters(plat_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    plat_rows = (await session.execute(plat_q)).all()

    platform_breakdown = [
        {
            "platform": row.platform,
            "total": row.total or 0,
            "published": int(row.published or 0),
            "failed": int(row.failed or 0),
        }
        for row in plat_rows
    ]

    # --- Daily publish trend ---
    trend_q = select(
        func.date(PublishRecord.created_at).label("day"),
        func.count(PublishRecord.id).label("publish_count"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("publish_success_count"),
        func.sum(case((PublishRecord.status == "failed", 1), else_=0)).label("failed_count"),
    ).group_by(func.date(PublishRecord.created_at)).order_by(func.date(PublishRecord.created_at))
    trend_q = _apply_time(trend_q, PublishRecord.created_at)
    trend_q = _apply_entity_filters(trend_q, user_id=user_id, channel_profile_id=channel_profile_id, platform=platform, entity="publish")
    trend_rows = (await session.execute(trend_q)).all()

    daily_publish_trend = [
        {
            "date": str(row.day),
            "job_count": 0,
            "completed_count": 0,
            "failed_count": int(row.failed_count or 0),
            "publish_count": row.publish_count or 0,
            "publish_success_count": int(row.publish_success_count or 0),
        }
        for row in trend_rows
    ]

    return {
        "window": window,
        "total_publish_count": total_publish,
        "published_count": published_count,
        "failed_count": failed_count,
        "draft_count": draft_count,
        "in_review_count": in_review_count,
        "scheduled_count": scheduled_count,
        "publish_success_rate": publish_success_rate,
        "avg_time_to_publish_seconds": avg_time_to_publish,
        "platform_breakdown": platform_breakdown,
        "daily_publish_trend": daily_publish_trend,
        "filters_applied": filters_applied,
    }


# ---------------------------------------------------------------------------
# Channel Performance Analytics (Faz 10)
# ---------------------------------------------------------------------------

async def get_channel_performance(
    session: AsyncSession,
    window: str = "last_30d",
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
) -> dict:
    """
    Kanal bazli performans analytics.

    Tek bir channel_profile_id seciliyse o kanalin detayi,
    secilmemisse tum kanallarin ozet + siralama listesi.

    Metrik gruplari:
      A) Production — ContentProject + Job
      B) Publish — PublishRecord
      C) Engagement — SyncedComment + EngagementTask + PlatformPost
      D) Channel Health — PlatformConnection durumu
    """
    if date_from is not None or date_to is not None:
        cut = None
    else:
        cut = _cutoff(window)

    def _apply_time(q, col):
        if date_from is not None:
            q = q.where(col >= date_from)
        elif cut is not None:
            q = q.where(col >= cut)
        if date_to is not None:
            q = q.where(col <= date_to)
        return q

    filters_applied = {}
    if user_id:
        filters_applied["user_id"] = user_id
    if channel_profile_id:
        filters_applied["channel_profile_id"] = channel_profile_id
    if platform:
        filters_applied["platform"] = platform

    # -----------------------------------------------------------------------
    # A) Production metrics — Job + ContentProject
    # -----------------------------------------------------------------------
    job_q = select(
        func.count(Job.id).label("total"),
        func.sum(case((Job.status == "completed", 1), else_=0)).label("completed"),
        func.sum(case((Job.status == "failed", 1), else_=0)).label("failed"),
        func.sum(case((Job.retry_count > 0, 1), else_=0)).label("retried"),
        func.avg(
            case(
                (
                    (Job.started_at.is_not(None)) & (Job.finished_at.is_not(None)),
                    epoch_diff_seconds(Job.started_at, Job.finished_at),
                ),
                else_=None,
            )
        ).label("avg_duration"),
    )
    job_q = _apply_time(job_q, Job.created_at)
    job_q = _apply_entity_filters(
        job_q, user_id=user_id, channel_profile_id=channel_profile_id,
        platform=platform, entity="job",
    )
    job_row = (await session.execute(job_q)).one()

    total_jobs = job_row.total or 0
    completed_jobs = int(job_row.completed or 0)
    failed_jobs = int(job_row.failed or 0)
    retried_jobs = int(job_row.retried or 0)
    avg_production = (
        round(float(job_row.avg_duration), 2) if job_row.avg_duration is not None else None
    )
    job_success_rate = round(completed_jobs / total_jobs, 4) if total_jobs > 0 else None
    retry_rate = round(retried_jobs / total_jobs, 4) if total_jobs > 0 else None

    # Content project count
    cp_q = select(func.count(ContentProject.id).label("total"))
    cp_q = _apply_time(cp_q, ContentProject.created_at)
    if channel_profile_id:
        cp_q = cp_q.where(ContentProject.channel_profile_id == channel_profile_id)
    if user_id:
        cp_q = cp_q.where(ContentProject.user_id == user_id)
    total_content = (await session.execute(cp_q)).scalar() or 0

    # Module distribution
    mod_q = select(
        Job.module_type,
        func.count(Job.id).label("count"),
    ).group_by(Job.module_type)
    mod_q = _apply_time(mod_q, Job.created_at)
    mod_q = _apply_entity_filters(
        mod_q, user_id=user_id, channel_profile_id=channel_profile_id,
        platform=platform, entity="job",
    )
    mod_rows = (await session.execute(mod_q)).all()
    module_distribution = [
        {"module_type": r.module_type or "unknown", "count": r.count}
        for r in mod_rows
    ]

    # -----------------------------------------------------------------------
    # B) Publish metrics — PublishRecord
    # -----------------------------------------------------------------------
    pub_q = select(
        func.count(PublishRecord.id).label("total"),
        func.sum(case((PublishRecord.status == "published", 1), else_=0)).label("published"),
        func.sum(case((PublishRecord.status == "failed", 1), else_=0)).label("failed"),
    )
    pub_q = _apply_time(pub_q, PublishRecord.created_at)
    pub_q = _apply_entity_filters(
        pub_q, user_id=user_id, channel_profile_id=channel_profile_id,
        platform=platform, entity="publish",
    )
    pub_row = (await session.execute(pub_q)).one()
    total_publish = pub_row.total or 0
    published_count = int(pub_row.published or 0)
    failed_publish = int(pub_row.failed or 0)
    publish_success_rate = round(published_count / total_publish, 4) if total_publish > 0 else None

    # -----------------------------------------------------------------------
    # C) Engagement metrics — SyncedComment, EngagementTask, PlatformPost
    # -----------------------------------------------------------------------

    # Comments
    comment_q = select(
        func.count(SyncedComment.id).label("total"),
        func.sum(case((SyncedComment.reply_status == "replied", 1), else_=0)).label("replied"),
        func.sum(case((SyncedComment.reply_status == "pending", 1), else_=0)).label("pending"),
    )
    comment_q = _apply_time(comment_q, SyncedComment.created_at)
    if channel_profile_id:
        comment_q = comment_q.where(SyncedComment.channel_profile_id == channel_profile_id)
    comment_row = (await session.execute(comment_q)).one()
    total_comments = comment_row.total or 0
    replied_comments = int(comment_row.replied or 0)
    pending_comments = int(comment_row.pending or 0)
    reply_rate = round(replied_comments / total_comments, 4) if total_comments > 0 else None

    # Engagement tasks
    task_q = select(
        func.count(EngagementTask.id).label("total"),
        func.sum(case((EngagementTask.status == "executed", 1), else_=0)).label("executed"),
        func.sum(case((EngagementTask.status == "failed", 1), else_=0)).label("failed"),
    )
    task_q = _apply_time(task_q, EngagementTask.created_at)
    if channel_profile_id:
        task_q = task_q.where(EngagementTask.channel_profile_id == channel_profile_id)
    if user_id:
        task_q = task_q.where(EngagementTask.user_id == user_id)
    task_row = (await session.execute(task_q)).one()
    total_tasks = task_row.total or 0
    executed_tasks = int(task_row.executed or 0)
    failed_tasks = int(task_row.failed or 0)

    # Engagement task type distribution
    task_type_q = select(
        EngagementTask.type,
        func.count(EngagementTask.id).label("count"),
    ).group_by(EngagementTask.type)
    task_type_q = _apply_time(task_type_q, EngagementTask.created_at)
    if channel_profile_id:
        task_type_q = task_type_q.where(EngagementTask.channel_profile_id == channel_profile_id)
    if user_id:
        task_type_q = task_type_q.where(EngagementTask.user_id == user_id)
    task_type_rows = (await session.execute(task_type_q)).all()
    engagement_type_distribution = [
        {"type": r.type, "count": r.count} for r in task_type_rows
    ]

    # Platform posts
    post_q = select(
        func.count(PlatformPost.id).label("total"),
        func.sum(case((PlatformPost.status == "draft", 1), else_=0)).label("draft"),
        func.sum(case((PlatformPost.status == "queued", 1), else_=0)).label("queued"),
        func.sum(case((PlatformPost.status == "posted", 1), else_=0)).label("posted"),
    )
    post_q = _apply_time(post_q, PlatformPost.created_at)
    if channel_profile_id:
        post_q = post_q.where(PlatformPost.channel_profile_id == channel_profile_id)
    post_row = (await session.execute(post_q)).one()
    total_posts = post_row.total or 0
    draft_posts = int(post_row.draft or 0)
    queued_posts = int(post_row.queued or 0)
    posted_posts = int(post_row.posted or 0)

    # Playlists
    playlist_q = select(
        func.count(SyncedPlaylist.id).label("total"),
        func.sum(SyncedPlaylist.item_count).label("total_items"),
    )
    if channel_profile_id:
        playlist_q = playlist_q.where(SyncedPlaylist.channel_profile_id == channel_profile_id)
    playlist_row = (await session.execute(playlist_q)).one()
    total_playlists = playlist_row.total or 0
    total_playlist_items = int(playlist_row.total_items or 0)

    # -----------------------------------------------------------------------
    # D) Channel health — PlatformConnection
    # -----------------------------------------------------------------------
    conn_q = select(
        func.count(PlatformConnection.id).label("total"),
        func.sum(case((PlatformConnection.connection_status == "connected", 1), else_=0)).label("connected"),
    )
    if channel_profile_id:
        conn_q = conn_q.where(PlatformConnection.channel_profile_id == channel_profile_id)
    conn_row = (await session.execute(conn_q)).one()
    total_connections = conn_row.total or 0
    connected_count = int(conn_row.connected or 0)

    # -----------------------------------------------------------------------
    # Daily trend (job + publish combined)
    # -----------------------------------------------------------------------
    trend_q = select(
        func.date(Job.created_at).label("day"),
        func.count(Job.id).label("job_count"),
        func.sum(case((Job.status == "completed", 1), else_=0)).label("completed_count"),
        func.sum(case((Job.status == "failed", 1), else_=0)).label("failed_count"),
    ).group_by(func.date(Job.created_at)).order_by(func.date(Job.created_at))
    trend_q = _apply_time(trend_q, Job.created_at)
    trend_q = _apply_entity_filters(
        trend_q, user_id=user_id, channel_profile_id=channel_profile_id,
        platform=platform, entity="job",
    )
    trend_rows = (await session.execute(trend_q)).all()
    daily_trend = [
        {
            "date": str(r.day),
            "job_count": r.job_count or 0,
            "completed_count": int(r.completed_count or 0),
            "failed_count": int(r.failed_count or 0),
        }
        for r in trend_rows
    ]

    # -----------------------------------------------------------------------
    # Channel list with per-channel summary (if no specific channel selected)
    # -----------------------------------------------------------------------
    channel_rankings = []
    if not channel_profile_id:
        rank_q = select(
            ChannelProfile.id,
            ChannelProfile.profile_name,
            ChannelProfile.channel_slug,
            ChannelProfile.status,
            func.count(Job.id).label("job_count"),
            func.sum(case((Job.status == "completed", 1), else_=0)).label("completed"),
            func.sum(case((Job.status == "failed", 1), else_=0)).label("failed"),
        ).outerjoin(Job, Job.channel_profile_id == ChannelProfile.id)
        rank_q = rank_q.group_by(ChannelProfile.id)
        rank_q = rank_q.order_by(func.count(Job.id).desc())

        if user_id:
            rank_q = rank_q.where(ChannelProfile.user_id == user_id)

        rank_rows = (await session.execute(rank_q)).all()
        for r in rank_rows:
            j_total = r.job_count or 0
            j_completed = int(r.completed or 0)
            j_failed = int(r.failed or 0)
            channel_rankings.append({
                "channel_id": r.id,
                "profile_name": r.profile_name,
                "channel_slug": r.channel_slug,
                "status": r.status,
                "job_count": j_total,
                "completed_count": j_completed,
                "failed_count": j_failed,
                "success_rate": round(j_completed / j_total, 4) if j_total > 0 else None,
            })

    # -----------------------------------------------------------------------
    # Recent errors
    # -----------------------------------------------------------------------
    err_q = select(
        Job.id, Job.module_type, Job.last_error, Job.created_at,
    ).where(
        Job.status == "failed",
        Job.last_error.is_not(None),
    ).order_by(Job.created_at.desc()).limit(5)
    err_q = _apply_entity_filters(
        err_q, user_id=user_id, channel_profile_id=channel_profile_id,
        platform=platform, entity="job",
    )
    err_rows = (await session.execute(err_q)).all()
    recent_errors = [
        {
            "job_id": r.id,
            "module_type": r.module_type,
            "error": (r.last_error or "")[:200],
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in err_rows
    ]

    return {
        "window": window,
        "filters_applied": filters_applied,
        # Production
        "total_content": total_content,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
        "job_success_rate": job_success_rate,
        "avg_production_duration_seconds": avg_production,
        "retry_rate": retry_rate,
        "module_distribution": module_distribution,
        # Publish
        "total_publish": total_publish,
        "published_count": published_count,
        "failed_publish": failed_publish,
        "publish_success_rate": publish_success_rate,
        # Engagement
        "total_comments": total_comments,
        "replied_comments": replied_comments,
        "pending_comments": pending_comments,
        "reply_rate": reply_rate,
        "total_engagement_tasks": total_tasks,
        "executed_tasks": executed_tasks,
        "failed_tasks": failed_tasks,
        "engagement_type_distribution": engagement_type_distribution,
        "total_posts": total_posts,
        "draft_posts": draft_posts,
        "queued_posts": queued_posts,
        "posted_posts": posted_posts,
        "total_playlists": total_playlists,
        "total_playlist_items": total_playlist_items,
        # Channel health
        "total_connections": total_connections,
        "connected_connections": connected_count,
        # Trends & rankings
        "daily_trend": daily_trend,
        "channel_rankings": channel_rankings,
        "recent_errors": recent_errors,
    }
