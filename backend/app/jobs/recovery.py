"""
Startup recovery scanner (Phase M1-C4).

Implements the P-008 / C-07 safety mechanism: scan for jobs and steps that
were interrupted (status=running/queued but no recent heartbeat) and mark
them as failed so the operator can decide what to do.

This scanner MUST complete before the server accepts any requests. It is
wired into the FastAPI lifespan startup handler in main.py.

Design rules:
  - All status changes go through the gateway functions in service.py (P-001).
  - No new JobStatus enum values are introduced here — 'failed' is used.
  - STALE_THRESHOLD is configurable; default is 5 minutes.
  - The function is idempotent: re-running it on already-failed jobs is safe
    because 'failed' has no outgoing transition back to 'running' (C-14).
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep
from app.jobs import service

logger = logging.getLogger(__name__)

DEFAULT_STALE_THRESHOLD_MINUTES: int = 5


@dataclass
class RecoverySummary:
    """Summary of what was found and fixed during startup recovery."""
    recovered_jobs: int = 0
    recovered_steps: int = 0
    job_ids: list[str] = field(default_factory=list)
    stale_queued_jobs: int = 0
    stale_queued_job_ids: list[str] = field(default_factory=list)


async def run_startup_recovery(
    db: AsyncSession,
    stale_threshold_minutes: int = DEFAULT_STALE_THRESHOLD_MINUTES,
    queued_stale_threshold_minutes: int = 30,  # Queued jobs get longer grace period
) -> RecoverySummary:
    """
    Scan for jobs/steps interrupted mid-run and mark them as failed.

    A job is considered stale if:
      - status == 'running', AND
      - heartbeat_at is NULL and started_at is older than STALE_THRESHOLD, OR
      - heartbeat_at is older than STALE_THRESHOLD

    For each stale job:
      - Transition job → 'failed' (via gateway).
      - For each step with status == 'running': transition step → 'failed'.

    Returns a RecoverySummary describing what was fixed.
    """
    now = datetime.now(timezone.utc)
    threshold = timedelta(minutes=stale_threshold_minutes)
    cutoff = now - threshold

    summary = RecoverySummary()

    # Fetch all running jobs
    result = await db.execute(
        select(Job).where(Job.status == "running")
    )
    running_jobs: list[Job] = list(result.scalars().all())

    for job in running_jobs:
        if not _is_stale(job, cutoff):
            continue

        job_id = job.id
        logger.warning(
            "Recovery: stale job found — id=%s, started_at=%s, heartbeat_at=%s",
            job_id,
            job.started_at,
            job.heartbeat_at,
        )

        # Recover running steps first
        step_result = await db.execute(
            select(JobStep).where(
                JobStep.job_id == job_id,
                JobStep.status == "running",
            )
        )
        running_steps: list[JobStep] = list(step_result.scalars().all())

        for step in running_steps:
            try:
                await service.transition_step_status(
                    db,
                    job_id,
                    step.step_key,
                    "failed",
                    last_error="Interrupted during startup recovery — process was killed or crashed.",
                )
                summary.recovered_steps += 1
                logger.warning(
                    "Recovery: step failed — job=%s, step=%s",
                    job_id,
                    step.step_key,
                )
            except Exception as exc:
                logger.error(
                    "Recovery: could not transition step %s on job %s: %s",
                    step.step_key,
                    job_id,
                    exc,
                )

        # Transition the job to failed
        try:
            await service.transition_job_status(
                db,
                job_id,
                "failed",
                last_error="Interrupted during startup recovery — process was killed or crashed.",
            )
            summary.recovered_jobs += 1
            summary.job_ids.append(job_id)
        except Exception as exc:
            logger.error(
                "Recovery: could not transition job %s to failed: %s",
                job_id,
                exc,
            )

    # --- Queued job staleness check ---
    # A job that is queued but has not been picked up for >threshold minutes
    # is stuck — the dispatcher that was supposed to pick it up either
    # crashed before starting it or never existed (e.g. process killed between
    # job creation and dispatch). Leaving such rows in 'queued' forever means
    # they accumulate in operator lists and never surface as terminal.
    #
    # The state machine only permits queued→{running,cancelled}; we cannot go
    # queued→failed directly (see contracts/state_machine.py). Semantically
    # 'cancelled' is the correct terminal for a job that never started, so we
    # transition stale queued rows to 'cancelled' with a clear last_error so
    # the operator sees exactly what happened and can retry / clone.
    queued_cutoff = now - timedelta(minutes=queued_stale_threshold_minutes)
    queued_result = await db.execute(
        select(Job).where(Job.status == "queued")
    )
    queued_jobs: list[Job] = list(queued_result.scalars().all())

    for job in queued_jobs:
        created = job.created_at
        if created is None:
            is_stale = True
        else:
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            is_stale = created < queued_cutoff

        if not is_stale:
            continue

        summary.stale_queued_jobs += 1
        summary.stale_queued_job_ids.append(job.id)
        logger.warning(
            "Recovery: stale queued job found — id=%s, created_at=%s "
            "(queued for >%d min); transitioning to cancelled.",
            job.id, job.created_at, queued_stale_threshold_minutes,
        )
        reason = (
            "Stuck in 'queued' for more than "
            f"{queued_stale_threshold_minutes} minutes — dispatcher "
            "never picked this job up (process likely crashed before "
            "dispatch). Marked cancelled during startup recovery."
        )
        try:
            transitioned = await service.transition_job_status(
                db, job.id, "cancelled",
            )
            # The 'cancelled' transition clears last_error by design (see
            # service.transition_job_status docstring). Persist the recovery
            # reason as a follow-up data field update so operators can see why.
            transitioned.last_error = reason
            await db.commit()
        except Exception as exc:
            logger.error(
                "Recovery: could not transition stale queued job %s to cancelled: %s",
                job.id, exc,
            )

    if summary.recovered_jobs == 0 and summary.stale_queued_jobs == 0:
        logger.info("Recovery: no stale jobs found.")
    else:
        if summary.recovered_jobs > 0:
            logger.warning(
                "Recovery complete: %d job(s) recovered, %d step(s) recovered. Job IDs: %s",
                summary.recovered_jobs,
                summary.recovered_steps,
                summary.job_ids,
            )
        if summary.stale_queued_jobs > 0:
            logger.warning(
                "Recovery: %d stale queued job(s) transitioned to cancelled. IDs: %s.",
                summary.stale_queued_jobs,
                summary.stale_queued_job_ids,
            )

    return summary


def _is_stale(job: Job, cutoff: datetime) -> bool:
    """
    Return True if the job's heartbeat (or started_at) is older than cutoff.

    cutoff is a UTC-aware datetime.
    """
    reference: Optional[datetime] = job.heartbeat_at or job.started_at
    if reference is None:
        # No timing info at all — treat as stale to be safe
        return True
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)
    return reference < cutoff
