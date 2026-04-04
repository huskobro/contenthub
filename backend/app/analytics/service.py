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

Desteklenmeyen metrikler (M8-C1):
  provider_error_rate — job_steps.provider_trace_json içinde tutarsız
  yapı nedeniyle güvenilir kaynak yok. M8-C2 veya Hardening fazında
  provider trace şeması sabitlenince eklenebilir.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep, PublishRecord

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Zaman filtresi yardımcısı
# ---------------------------------------------------------------------------

_TIME_WINDOWS: dict[str, Optional[timedelta]] = {
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
      avg_render_duration_seconds   : render step'lerin ortalama süresi
      step_stats                    : step_key başına {count, avg_elapsed, failed_count}
      provider_error_rate           : UNSUPPORTED — M8-C1'de kaynak yok (None)
    """
    cut = _cutoff(window)

    # --- Render step ortalama süresi ---
    render_q = select(
        func.avg(JobStep.elapsed_seconds).label("avg_render"),
    ).where(JobStep.step_key == "render")
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

    return {
        "window": window,
        "avg_render_duration_seconds": avg_render,
        "step_stats": step_stats,
        "provider_error_rate": None,  # M8-C1: kaynak yok; provider_trace_json yapısı sabitlenmedi
    }
