"""
Analytics Servis Katmanı — M8-C1, M16, M17, M18.

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
  provider_error_rate — provider-dependent step'lerin (script, metadata,
  tts, visuals) başarısızlık oranı.

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
    StandardVideo, Template, StyleBlueprint,
)

logger = logging.getLogger(__name__)

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
    ).where(JobStep.step_key == "composition")
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
    ).where(JobStep.step_key.in_(["script", "metadata", "tts", "visuals"]))
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
        JobStep.step_key.in_(["script", "metadata", "tts", "visuals"]),
        JobStep.provider_trace_json.is_not(None),
    )
    if cut is not None:
        provider_trace_q = provider_trace_q.where(JobStep.created_at >= cut)

    trace_rows = (await session.execute(provider_trace_q)).all()

    # Provider bazlı aggregation
    provider_summary: dict[str, dict] = {}
    for row in trace_rows:
        trace_json = row.provider_trace_json
        if not trace_json:
            continue
        try:
            parsed = _json_loads(trace_json)
        except Exception:
            continue

        # Trace, result dict'in içinde "provider_trace" altında olabilir
        trace = parsed.get("provider_trace", parsed) if isinstance(parsed, dict) else {}
        if not isinstance(trace, dict):
            continue

        pname = trace.get("provider_name", row.step_key)
        if pname not in provider_summary:
            provider_summary[pname] = {
                "provider_name": pname,
                "provider_kind": trace.get("provider_kind", "unknown"),
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

    return {
        "window": window,
        "avg_render_duration_seconds": avg_render,
        "step_stats": step_stats,
        "provider_error_rate": provider_error_rate,
        "provider_stats": provider_stats,
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
    ).where(Job.module_type.is_not(None)).group_by(Job.module_type)
    module_q = _apply_time_filter(module_q, Job.created_at)

    module_rows = (await session.execute(module_q)).all()
    module_distribution = []
    for row in module_rows:
        total = row.total or 0
        completed = int(row.completed or 0)
        failed = int(row.failed or 0)
        module_distribution.append({
            "module_type": row.module_type,
            "total_jobs": total,
            "completed_jobs": completed,
            "failed_jobs": failed,
            "success_rate": round(completed / total, 4) if total > 0 else None,
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
