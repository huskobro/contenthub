"""
Timing helpers for job and step elapsed time and ETA estimation (Phase M1-C4).

Pure helper functions (no DB access, no side effects) plus DB-backed historical
step averages and job response enrichment (merged from timing_service.py).

Timezone-aware: naive datetimes are normalised to UTC before any arithmetic.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep


# ---------------------------------------------------------------------------
# Pure timing helpers
# ---------------------------------------------------------------------------


def _to_utc(dt: datetime) -> datetime:
    """Return dt in UTC, converting naive datetimes by assuming they are UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def elapsed_seconds(started_at: Optional[datetime]) -> Optional[float]:
    """
    Return elapsed wall-clock seconds since *started_at*.

    Returns None if started_at is None (job/step not yet started).
    """
    if started_at is None:
        return None
    now = datetime.now(timezone.utc)
    started = _to_utc(started_at)
    delta = (now - started).total_seconds()
    return max(0.0, delta)


def format_elapsed(seconds: float) -> str:
    """
    Return a human-readable elapsed string.

    Examples:
        45.0   -> '45s'
        154.0  -> '2m 34s'
        4320.0 -> '1h 12m'
    """
    total = int(seconds)
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)

    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


def estimate_remaining_seconds(
    elapsed: float,
    progress_fraction: float,
) -> Optional[float]:
    """
    Simple linear ETA estimate.

    Args:
        elapsed           : seconds already spent
        progress_fraction : fraction of work done, in [0.0, 1.0]

    Returns:
        None  if progress_fraction == 0 (no basis for estimate)
        0.0   if progress_fraction >= 1 (work is done)
        float : estimated remaining seconds (linear projection)
    """
    if progress_fraction <= 0.0:
        return None
    if progress_fraction >= 1.0:
        return 0.0
    total_estimated = elapsed / progress_fraction
    remaining = total_estimated - elapsed
    return max(0.0, remaining)


def estimate_remaining_from_history(
    elapsed: float,
    completed_steps: int,
    total_steps: int,
    historical_averages: dict[str, float],
    remaining_step_keys: list[str],
) -> Optional[float]:
    """
    ETA estimate using historical step averages.

    Sums up historical average durations for remaining steps.
    Falls back to linear projection for steps without historical data.
    Returns None if no basis for estimate.
    """
    if total_steps <= 0 or completed_steps >= total_steps:
        return 0.0

    total_remaining = 0.0
    unknown_count = 0

    for key in remaining_step_keys:
        avg = historical_averages.get(key)
        if avg is not None:
            total_remaining += avg
        else:
            unknown_count += 1

    # For unknown steps, use average of known step durations as fallback
    if unknown_count > 0:
        known_count = len(remaining_step_keys) - unknown_count
        if known_count > 0 and total_remaining > 0:
            avg_known = total_remaining / known_count
            total_remaining += avg_known * unknown_count
        else:
            # No historical data at all — fall back to linear estimate
            fraction = step_progress_fraction(completed_steps, total_steps)
            return estimate_remaining_seconds(elapsed, fraction)

    return max(0.0, total_remaining)


def step_progress_fraction(
    completed_steps: int,
    total_steps: int,
) -> float:
    """
    Return completed_steps / total_steps, clamped to [0.0, 1.0].

    Returns 0.0 if total_steps is 0.
    """
    if total_steps <= 0:
        return 0.0
    fraction = completed_steps / total_steps
    return max(0.0, min(1.0, fraction))


# ---------------------------------------------------------------------------
# DB-backed historical step averages and job response enrichment
# (merged from timing_service.py)
# ---------------------------------------------------------------------------

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

    Thin wrapper around estimate_remaining_from_history for clarity.
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
