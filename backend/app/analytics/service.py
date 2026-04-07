"""
Analytics Servis Katmanı — M8-C1, M16, M17, M18, M37, M38.

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
)
from app.prompt_assembly.models import PromptAssemblyRun

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider-dependent step keys — tek noktadan yönetim (M38)
# Yeni bir provider-dependent step eklendiğinde buraya eklenmeli.
# ---------------------------------------------------------------------------
PROVIDER_STEP_KEYS = ["script", "metadata", "tts", "visuals"]

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
# Overview metrikleri
# ---------------------------------------------------------------------------

async def get_overview_metrics(
    session: AsyncSession,
    window: str = "all_time",
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
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
                    func.julianday(Job.finished_at) * 86400.0
                    - func.julianday(Job.started_at) * 86400.0,
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
    review_pending_row = (await session.execute(review_pending_q)).one()
    review_pending_count = int(review_pending_row.pending or 0)

    publish_backlog_q = select(
        func.count(PublishRecord.id).label("backlog"),
    ).where(PublishRecord.status.in_(["approved", "scheduled"]))
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
) -> dict:
    """
    Operasyonel metrikler.

    Döndürülen alanlar:
      window                        : zaman penceresi
      avg_render_duration_seconds   : composition step'lerin ortalama süresi.
                                      Canonical kaynak: step_key='composition'
                                      (standard_video pipeline step_order=6).
                                      RenderStepExecutor.step_key='render' pipeline'a
                                      bağlı değil; bu metrik için kullanılmaz.
      step_stats                    : step_key başına {count, avg_elapsed, failed_count}
      provider_error_rate           : Provider-dependent step'lerin (script,
                                      metadata, tts, visuals) başarısızlık oranı.
                                      Veri yoksa None döner.
    """
    cut = _cutoff(window)

    # --- Composition step ortalama süresi (canonical render proxy) ---
    # standard_video pipeline'da render adımı 'composition' (step_order=6).
    # RenderStepExecutor.step_key='render' pipeline'a bağlı değil.
    render_q = select(
        func.avg(JobStep.elapsed_seconds).label("avg_render"),
    ).where(JobStep.step_key == RENDER_STEP_KEY)
    if cut is not None:
        render_q = render_q.where(JobStep.created_at >= cut)

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
    # Provider-dependent steps: script, metadata, tts, visuals
    # These steps use external provider APIs; their failure rate = provider error rate
    provider_step_q = select(
        func.count(JobStep.id).label("total"),
        func.sum(case((JobStep.status == "failed", 1), else_=0)).label("failed"),
    ).where(JobStep.step_key.in_(PROVIDER_STEP_KEYS))
    if cut is not None:
        provider_step_q = provider_step_q.where(JobStep.created_at >= cut)

    provider_row = (await session.execute(provider_step_q)).one()
    provider_total = provider_row.total or 0
    provider_failed = int(provider_row.failed or 0)
    provider_error_rate = (
        round(provider_failed / provider_total, 4) if provider_total > 0 else None
    )

    # --- Provider bazlı özet (M16) ---
    # provider_trace_json alanından gerçek trace verisi çıkar.
    # JSON parse SQLite'da text fonksiyonlarıyla yapılır.
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
) -> dict:
    """
    Kaynak bazlı etki metrikleri.

    Döndürülen alanlar:
      window              : zaman penceresi
      total_sources       : toplam kaynak sayısı
      active_sources      : status='active' kaynak sayısı
      total_scans         : toplam tarama sayısı
      successful_scans    : status='completed' tarama sayısı
      total_news_items    : toplam haber öğesi sayısı
      used_news_count     : kullanılan (used) haber sayısı
      bulletin_count      : oluşturulan bulletin sayısı
      source_stats        : kaynak bazlı detaylı istatistikler listesi
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
    # Her kaynak için: scan sayısı, haber sayısı, kullanılan haber sayısı
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
        # Kullanılan haber sayısı bu kaynak üzerinden
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

    yt_row = (await session.execute(yt_q)).one()

    total_yt = yt_row.total or 0
    published_yt = int(yt_row.published or 0)
    failed_yt = int(yt_row.failed or 0)
    draft_yt = int(yt_row.draft or 0)
    in_progress_yt = int(yt_row.in_progress or 0)
    last_published_at = str(yt_row.last_published_at) if yt_row.last_published_at else None

    # Bağlantı durumu — credentials tablosundan değil, publish record varlığından çıkarılır
    # Gerçek YouTube OAuth durumu frontend'de useYouTubeStatus ile kontrol edilir
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
) -> dict:
    """
    İçerik düzeyinde analytics metrikleri.

    Modül dağılımı, içerik üretim sayıları, yayın durumu ve ortalama
    yayına kadar geçen süre gibi metrikleri gerçek veriden üretir.
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
                    func.julianday(Job.finished_at) * 86400.0
                    - func.julianday(Job.started_at) * 86400.0,
                ),
                else_=None,
            )
        ).label("avg_prod_duration"),
    ).where(Job.module_type.is_not(None)).group_by(Job.module_type)
    module_q = _apply_time_filter(module_q, Job.created_at)

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
    # StandardVideo sayısı
    sv_q = select(func.count(StandardVideo.id).label("total"))
    sv_q = _apply_time_filter(sv_q, StandardVideo.created_at)
    sv_count = (await session.execute(sv_q)).scalar() or 0

    # NewsBulletin sayısı
    nb_q = select(func.count(NewsBulletin.id).label("total"))
    nb_q = _apply_time_filter(nb_q, NewsBulletin.created_at)
    nb_count = (await session.execute(nb_q)).scalar() or 0

    content_output_count = sv_count + nb_count

    # --- Yayınlanan içerik sayısı ---
    pub_q = select(func.count(PublishRecord.id).label("total")).where(
        PublishRecord.status == "published"
    )
    pub_q = _apply_time_filter(pub_q, PublishRecord.created_at)
    published_content_count = (await session.execute(pub_q)).scalar() or 0

    # --- Ortalama yayına kadar geçen süre ---
    # Job oluşturma → publish_records.published_at arası ortalama (sadece published olanlar)
    time_to_pub_q = select(
        func.avg(
            func.julianday(PublishRecord.published_at) * 86400.0
            - func.julianday(Job.created_at) * 86400.0,
        ).label("avg_time")
    ).join(Job, Job.id == PublishRecord.job_id).where(
        PublishRecord.status == "published",
        PublishRecord.published_at.is_not(None),
        Job.created_at.is_not(None),
    )
    time_to_pub_q = _apply_time_filter(time_to_pub_q, PublishRecord.created_at)
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
) -> dict:
    """
    Per-template and per-blueprint job success rates and avg durations.

    Joins Job table with template_id (direct column on Job),
    then to Template and StyleBlueprint tables via TemplateStyleLink.
    """
    cut = _cutoff(window)

    # --- Per-template stats ---
    # Job.template_id is a direct column (not JSON extraction needed).
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
                        func.julianday(Job.finished_at) * 86400.0
                        - func.julianday(Job.started_at) * 86400.0,
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
    # Join Job -> TemplateStyleLink (via template_id) -> StyleBlueprint
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
) -> dict:
    """
    Prompt Assembly çalışma metrikleri.

    Döndürülen alanlar:
      window                 : zaman penceresi
      total_assembly_runs    : toplam assembly çalışması
      dry_run_count          : is_dry_run=True olanlar
      production_run_count   : is_dry_run=False olanlar
      avg_included_blocks    : ortalama dahil edilen blok sayısı
      avg_skipped_blocks     : ortalama atlanan blok sayısı
      module_stats           : modül bazında aggregation
      provider_stats         : provider bazında aggregation
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
