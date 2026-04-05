"""
Analytics Servis Katmanı — M8-C1.

Mevcut tablolardan (jobs, job_steps, publish_records) salt okunur
aggregation sorguları. Şema değişikliği yok, migration yok, yazma yok.

Kural: Bu servis hiçbir zaman publish_service veya job_service
fonksiyonlarını çağırmaz. Doğrudan SELECT sorgularıyla çalışır.

Zaman filtresi:
  last_7d  : son 7 gün
  last_30d : son 30 gün
  last_90d : son 90 gün
  all_time : filtre yok

Provider error rate (M11):
  provider_error_rate — provider-dependent step'lerin (script, metadata,
  tts, visuals) başarısızlık oranı. Bu step'ler harici provider API'leri
  kullanır; failed/total oranı provider error rate olarak raporlanır.
"""

import json as _json_module
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

_json_loads = _json_module.loads

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep, PublishRecord

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
    """
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
    if cut is not None:
        job_q = job_q.where(Job.created_at >= cut)

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
    if cut is not None:
        pub_q = pub_q.where(PublishRecord.created_at >= cut)

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
