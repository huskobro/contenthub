"""
Job Auto-Retry Scheduler.

Background task that polls for failed retryable jobs and
automatically retries them using the rerun pattern (creates new job).

Safety:
  - Respects max_auto_retries setting
  - Exponential backoff prevents rapid retry storms
  - Individual retry failures don't kill the loop
  - Disabled by default (must be enabled in settings)
  - Batch-limited to 5 jobs per cycle to prevent overload
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select

from app.db.models import Job

logger = logging.getLogger(__name__)

_DEFAULT_INTERVAL = 120  # 2 minutes
_MAX_AUTO_RETRIES = 3
_BASE_DELAY_SECONDS = 60


async def poll_retryable_jobs(
    db_session_factory,
    app_state,
    interval: float = _DEFAULT_INTERVAL,
    max_retries: int = _MAX_AUTO_RETRIES,
    base_delay: int = _BASE_DELAY_SECONDS,
) -> None:
    """
    Infinite loop that checks for failed retryable jobs.

    This function is designed to run as an asyncio.Task.
    It catches all exceptions to prevent the loop from dying.

    Args:
        db_session_factory: Async session factory for DB access.
        app_state: FastAPI app.state — used to access job_dispatcher.
        interval: Seconds between poll cycles.
        max_retries: Maximum auto-retry count per original job lineage.
        base_delay: Base delay in seconds for exponential backoff.
    """
    logger.info(
        "Job retry scheduler started (interval=%ss, max_retries=%d, base_delay=%ds)",
        interval, max_retries, base_delay,
    )
    while True:
        try:
            await asyncio.sleep(interval)
            count = await _check_and_retry(
                db_session_factory, app_state,
                max_retries=max_retries,
                base_delay=base_delay,
            )
            if count > 0:
                logger.info("Retry scheduler retried %d job(s).", count)
        except asyncio.CancelledError:
            logger.info("Job retry scheduler cancelled.")
            break
        except Exception as exc:
            logger.warning("Job retry scheduler error: %s", exc)
            # Continue — scheduler must not die


async def _check_and_retry(
    db_session_factory,
    app_state,
    max_retries: int,
    base_delay: int,
) -> int:
    """Check for failed retryable jobs and rerun them. Returns count."""
    retried = 0
    now = datetime.now(timezone.utc)

    async with db_session_factory() as db:
        # Find failed jobs that haven't exceeded max retries
        stmt = (
            select(Job)
            .where(
                Job.status == "failed",
                Job.retry_count < max_retries,
            )
            .order_by(Job.updated_at.asc())
            .limit(5)
        )
        result = await db.execute(stmt)
        jobs = list(result.scalars().all())

        for job in jobs:
            try:
                # Exponential backoff: wait longer for each retry
                backoff = base_delay * (2 ** job.retry_count)
                reference_time = job.updated_at or job.created_at
                # Handle naive datetimes from SQLite
                if reference_time.tzinfo is None:
                    reference_time = reference_time.replace(tzinfo=timezone.utc)
                earliest_retry = reference_time + timedelta(seconds=backoff)

                if now < earliest_retry:
                    continue  # Not yet time to retry

                # Use the rerun pattern (same as router retry endpoint):
                # Create a new job with the same inputs and dispatch it.
                from app.jobs.schemas import JobCreate
                from app.jobs.service import create_job
                from app.jobs.step_initializer import initialize_job_steps
                from app.modules.registry import module_registry

                job_create = JobCreate(
                    module_type=job.module_type,
                    owner_id=job.owner_id,
                    template_id=job.template_id,
                    source_context_json=job.source_context_json,
                    input_data_json=job.input_data_json,
                    workspace_path=None,  # New workspace will be created
                )
                new_job = await create_job(db, job_create)

                # Carry forward retry lineage count
                new_job.retry_count = job.retry_count + 1
                await db.commit()
                await db.refresh(new_job)

                # Initialize steps for the new job
                await initialize_job_steps(
                    db, new_job.id, new_job.module_type, module_registry,
                )

                # Dispatch via dispatcher
                dispatcher = getattr(app_state, "job_dispatcher", None)
                if dispatcher is not None:
                    await dispatcher.dispatch(new_job.id)

                retried += 1

                logger.info(
                    "Auto-retry triggered: original_job=%s, new_job=%s, retry_count=%d",
                    job.id, new_job.id, new_job.retry_count,
                )

                # Audit log (best-effort)
                try:
                    from app.audit.service import write_audit_log
                    await write_audit_log(
                        db, action="job.auto_retry",
                        entity_type="job", entity_id=str(new_job.id),
                        actor_type="system",
                        details={
                            "original_job_id": str(job.id),
                            "new_job_id": str(new_job.id),
                            "retry_count": new_job.retry_count,
                        },
                    )
                    await db.commit()
                except Exception as exc:
                    logger.warning("Audit log write failed (job.retry): %s", exc)

            except Exception as exc:
                logger.warning(
                    "Auto-retry failed for job %s: %s", job.id, exc,
                )

    return retried
