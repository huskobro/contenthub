"""
Timing service — DB-backed historical step averages and job response enrichment.

Queries completed jobs for per-step average durations and injects historical
ETA into JobResponse objects. Pure async functions using SQLAlchemy.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep
from app.jobs.timing import (
    elapsed_seconds as _elapsed_seconds,
    estimate_remaining_from_history,
    step_progress_fraction,
)

# Minimum completed jobs required before historical averages are trusted.
_MIN_SAMPLES = 3


async def get_historical_step_averages(
    db: AsyncSession,
    module_type: str,
) -> dict[str, float]:
    """
    Return {step_key: avg_elapsed_seconds} for completed jobs of the given module.

    Only includes step keys with at least _MIN_SAMPLES completed samples.
    Skipped steps are excluded (they have no meaningful elapsed time).
    """
    # Subquery: completed job IDs for this module
    completed_job_ids = (
        select(Job.id)
        .where(Job.module_type == module_type, Job.status == "completed")
        .subquery()
    )

    stmt = (
        select(
            JobStep.step_key,
            func.avg(JobStep.elapsed_seconds).label("avg_elapsed"),
            func.count().label("sample_count"),
        )
        .where(
            JobStep.job_id.in_(select(completed_job_ids.c.id)),
            JobStep.status == "completed",
            JobStep.elapsed_seconds.isnot(None),
        )
        .group_by(JobStep.step_key)
        .having(func.count() >= _MIN_SAMPLES)
    )

    result = await db.execute(stmt)
    rows = result.all()
    return {row.step_key: float(row.avg_elapsed) for row in rows}


def compute_historical_eta(
    elapsed: float,
    completed_steps: int,
    total_steps: int,
    remaining_step_keys: list[str],
    historical_averages: dict[str, float],
) -> Optional[float]:
    """
    Compute ETA using historical step averages.

    Thin wrapper around timing.estimate_remaining_from_history for clarity.
    Returns None if no basis for estimate.
    """
    if total_steps <= 0:
        return 0.0

    return estimate_remaining_from_history(
        elapsed=elapsed,
        completed_steps=completed_steps,
        total_steps=total_steps,
        historical_averages=historical_averages,
        remaining_step_keys=remaining_step_keys,
    )


async def enrich_job_eta(
    db: AsyncSession,
    job_response,
) -> None:
    """
    Enrich a JobResponse with historical ETA if the job is running.

    Modifies job_response.eta_seconds in-place. If no historical data
    is available, falls back to the linear estimate already computed
    by the model_validator.
    """
    if job_response.status != "running":
        return
    if not job_response.steps:
        return
    if job_response.elapsed_seconds is None:
        return

    historical = await get_historical_step_averages(db, job_response.module_type)
    if not historical:
        # No historical data — keep the linear estimate from model_validator
        return

    completed_keys = {
        s.step_key for s in job_response.steps
        if s.status in ("completed", "skipped")
    }
    remaining_keys = [
        s.step_key for s in job_response.steps
        if s.step_key not in completed_keys
    ]
    completed_count = len(completed_keys)
    total_count = len(job_response.steps)

    eta = compute_historical_eta(
        elapsed=job_response.elapsed_seconds,
        completed_steps=completed_count,
        total_steps=total_count,
        remaining_step_keys=remaining_keys,
        historical_averages=historical,
    )

    if eta is not None:
        job_response.eta_seconds = eta

    # Step-level ETA: for the currently running step, estimate remaining
    # using historical average minus elapsed so far.
    for step in job_response.steps:
        if step.status == "running" and step.elapsed_seconds_live is not None:
            avg = historical.get(step.step_key)
            if avg is not None:
                step.eta_seconds = max(0.0, avg - step.elapsed_seconds_live)
