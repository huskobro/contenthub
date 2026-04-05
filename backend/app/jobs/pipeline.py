"""
Pipeline Runner (Phase M1-C2)

Drives a single job through its registered steps sequentially.
Owns all state transitions — no other code path may transition job or step
status while the pipeline is running.

Responsibilities:
  - Fetch job and steps from DB
  - Transition job to running
  - Iterate steps in step_order ascending
  - For each step: transition to running → call executor → transition to completed
  - On step failure: transition step to failed, job to failed, stop
  - On all steps complete: transition job to completed
  - Update heartbeat_at on job at every step boundary

This class does NOT:
  - Spawn background tasks (that is M1-C3's concern)
  - Handle crash recovery (that is M1-C4's startup scanner)
  - Retry steps (retry policy is a later phase)

All state transitions go through service.transition_job_status /
service.transition_step_status per P-001.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep
from app.jobs import service
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import (
    JobNotFoundError,
    StepExecutionError,
)

if TYPE_CHECKING:
    from app.sse.bus import EventBus

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PipelineRunner:
    """
    Drives a single job through its registered steps sequentially.

    Args:
        db         : async DB session owned by the caller
        executors  : mapping of step_key → StepExecutor instance
    """

    def __init__(
        self,
        db: AsyncSession,
        executors: dict[str, StepExecutor],
        event_bus: Optional["EventBus"] = None,
        template_context: Optional[dict] = None,
    ) -> None:
        self._db = db
        self._executors = executors
        self._event_bus = event_bus
        self._template_context = template_context

    async def run(self, job_id: str) -> None:
        """
        Main entry point. Fetches job, runs each step in sequence.

        Raises JobNotFoundError if the job does not exist.
        Transitions the job to FAILED if any step fails.
        Transitions the job to COMPLETED when all steps finish.
        """
        job = await service.get_job(self._db, job_id)
        if job is None:
            raise JobNotFoundError(job_id)

        # Transition job to running (validates from queued → running via gateway)
        job = await service.transition_job_status(
            self._db, job_id, "running"
        )

        # Attach template context as transient attribute (M11)
        # Executors read via getattr(job, '_template_context', None)
        if self._template_context:
            object.__setattr__(job, '_template_context', self._template_context)
        if self._event_bus is not None:
            self._event_bus.publish_job_update(job_id, "running", job.current_step_key)
        await self._update_heartbeat(job_id)

        # Fetch steps ordered by step_order ascending
        steps = await service.get_job_steps(self._db, job_id)
        steps_ordered = sorted(steps, key=lambda s: s.step_order)

        for step in steps_ordered:
            success = await self._run_step(job, step)
            if not success:
                # step failure already transitioned step → failed
                # now transition the job → failed
                await service.transition_job_status(
                    self._db,
                    job_id,
                    "failed",
                    last_error=f"Step '{step.step_key}' failed.",
                )
                if self._event_bus is not None:
                    self._event_bus.publish_job_update(job_id, "failed", step.step_key)
                await self._update_heartbeat(job_id)
                return

        # All steps complete
        await service.transition_job_status(self._db, job_id, "completed")
        if self._event_bus is not None:
            self._event_bus.publish_job_update(job_id, "completed", None)
        await self._update_heartbeat(job_id)

    async def _run_step(self, job: Job, step: JobStep) -> bool:
        """
        Execute a single step. Returns True on success, False on failure.

        Transitions:
            pending  → running  (before executor call)
            running  → completed (after successful executor call)
            running  → failed   (after StepExecutionError)
        """
        step_key = step.step_key

        # Transition step to running
        step = await service.transition_step_status(
            self._db, job.id, step_key, "running"
        )
        if self._event_bus is not None:
            self._event_bus.publish_step_update(job.id, step_key, "running")
        await self._update_heartbeat(job.id)

        # Update job's current_step_key pointer directly — this is a data field
        # update, not a state transition, so we do not call transition_job_status.
        await self._update_current_step_key(job.id, step_key)

        executor = self._executors.get(step_key)
        if executor is None:
            # No executor registered — treat as a fatal step failure
            error_msg = f"No executor registered for step type '{step_key}'."
            logger.error(error_msg)
            await service.transition_step_status(
                self._db,
                job.id,
                step_key,
                "failed",
                last_error=error_msg,
            )
            if self._event_bus is not None:
                self._event_bus.publish_step_update(job.id, step_key, "failed")
            return False

        try:
            result: dict = await executor.execute(job, step)
        except StepExecutionError as exc:
            logger.error(
                "Step '%s' on job '%s' failed: %s", step_key, job.id, exc
            )
            await service.transition_step_status(
                self._db,
                job.id,
                step_key,
                "failed",
                last_error=str(exc),
            )
            if self._event_bus is not None:
                self._event_bus.publish_step_update(job.id, step_key, "failed")
            return False
        except Exception as exc:
            # Unexpected exception — wrap and fail the step
            error_msg = f"Unexpected error in step '{step_key}': {exc}"
            logger.exception(error_msg)
            await service.transition_step_status(
                self._db,
                job.id,
                step_key,
                "failed",
                last_error=error_msg,
            )
            if self._event_bus is not None:
                self._event_bus.publish_step_update(job.id, step_key, "failed")
            return False

        # Store result as provider_trace_json and transition to completed
        trace_json = json.dumps(result)
        await service.transition_step_status(
            self._db,
            job.id,
            step_key,
            "completed",
            artifact_refs_json=trace_json,
        )
        if self._event_bus is not None:
            self._event_bus.publish_step_update(job.id, step_key, "completed")
        # Also persist provider_trace_json on the step directly via a targeted update
        await self._store_provider_trace(job.id, step_key, trace_json)
        await self._update_heartbeat(job.id)

        return True

    async def _update_heartbeat(self, job_id: str) -> None:
        """Update heartbeat_at on the job row directly (not a status transition)."""
        job = await service.get_job(self._db, job_id)
        if job is None:
            return
        job.heartbeat_at = _now()
        await self._db.commit()

    async def _update_current_step_key(self, job_id: str, step_key: str) -> None:
        """Update current_step_key on the job row directly (not a state transition)."""
        job = await service.get_job(self._db, job_id)
        if job is None:
            return
        job.current_step_key = step_key
        await self._db.commit()

    async def _store_provider_trace(
        self, job_id: str, step_key: str, trace_json: str
    ) -> None:
        """Write provider_trace_json to the step row."""
        step = await service.get_job_step(self._db, job_id, step_key)
        if step is None:
            return
        step.provider_trace_json = trace_json
        await self._db.commit()
