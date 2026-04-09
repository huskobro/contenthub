"""
Job Engine service layer (Phase 7 + Phase 1.2).

Phase 7 — CRUD foundation:
    list_jobs, get_job, get_job_steps, create_job

Phase 1.2 — State machine enforcement:
    validate_job_transition   — pure validation, no DB write
    validate_step_transition  — pure validation, no DB write
    transition_job_status     — validate + apply side effects + persist
    transition_step_status    — validate + apply side effects + persist

All status changes on Job and JobStep MUST go through transition_job_status
or transition_step_status. Direct ORM attribute assignment on .status is
forbidden in any other service or router — it bypasses validation and
breaks the side-effect contract.

Side-effect rules (Phase 1.2):
    Job:
        → running   : set started_at (if null), clear last_error
        → waiting   : no timestamp change beyond updated_at
        → retrying  : increment retry_count, clear last_error
        → completed : set finished_at, clear current_step_key, clear last_error
        → failed    : set finished_at, set last_error (caller supplies)
        → cancelled : set finished_at, clear last_error

    JobStep:
        → running   : set started_at (if null)
        → completed : set finished_at, calculate elapsed_seconds
        → failed    : set finished_at, calculate elapsed_seconds, set last_error
        → skipped   : set finished_at (no elapsed change, step never ran)
        → retrying  : clear last_error (retry is in progress; error will be
                       set again if it fails once more)

Settings Registry integration note:
    Fields such as max_concurrent_jobs, retry policy defaults, and
    workspace_root will be read from Settings Registry in Phase 1.3+.
    No hardcoded policy defaults are introduced here — this layer only
    enforces the state machine and its side effects.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, JobStep
from app.jobs.schemas import JobCreate
from app.jobs.exceptions import (
    InvalidTransitionError,
    JobNotFoundError,
    StepNotFoundError,
)
from app.contracts.state_machine import JobStateMachine, StepStateMachine
from app.automation.event_hooks import emit_operation_event


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ===========================================================================
# Phase 7 — CRUD (unchanged)
# ===========================================================================

async def list_jobs(
    db: AsyncSession,
    status: Optional[str] = None,
    module_type: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
    owner_id: Optional[str] = None,
) -> list[Job]:
    stmt = select(Job).order_by(Job.created_at.desc())
    if not include_test_data:
        stmt = stmt.where(Job.is_test_data == False)  # noqa: E712
    if status:
        stmt = stmt.where(Job.status == status)
    if module_type:
        stmt = stmt.where(Job.module_type == module_type)
    if owner_id:
        stmt = stmt.where(Job.owner_id == owner_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Job.module_type.ilike(pattern) | Job.id.ilike(pattern)
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_job(db: AsyncSession, job_id: str) -> Optional[Job]:
    result = await db.execute(select(Job).where(Job.id == job_id))
    return result.scalar_one_or_none()


async def get_job_steps(db: AsyncSession, job_id: str) -> list[JobStep]:
    result = await db.execute(
        select(JobStep)
        .where(JobStep.job_id == job_id)
        .order_by(JobStep.step_order)
    )
    return list(result.scalars().all())


async def get_job_step(
    db: AsyncSession, job_id: str, step_key: str
) -> Optional[JobStep]:
    result = await db.execute(
        select(JobStep).where(
            JobStep.job_id == job_id,
            JobStep.step_key == step_key,
        )
    )
    return result.scalar_one_or_none()


async def check_module_enabled(db: AsyncSession, module_id: str) -> None:
    """Raise ModuleDisabledError if the module is disabled in settings."""
    from app.settings.settings_resolver import resolve
    from app.jobs.exceptions import ModuleDisabledError

    enabled_key = f"module.{module_id}.enabled"
    enabled = await resolve(enabled_key, db)
    if enabled is False:
        raise ModuleDisabledError(module_id)


async def create_job(db: AsyncSession, payload: JobCreate) -> Job:
    job = Job(
        module_type=payload.module_type,
        owner_id=payload.owner_id,
        template_id=payload.template_id,
        source_context_json=payload.source_context_json,
        input_data_json=payload.input_data_json,
        workspace_path=payload.workspace_path,
        status="queued",
        retry_count=0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


# ===========================================================================
# M31 — Test data management
# ===========================================================================

async def mark_jobs_as_test_data(db: AsyncSession, job_ids: list[str]) -> int:
    """
    Mark the given job IDs as test/demo data (is_test_data=True).

    These records are NOT deleted — they are hidden from the default list view.
    Returns the number of rows updated.
    """
    if not job_ids:
        return 0
    stmt = (
        update(Job)
        .where(Job.id.in_(job_ids))
        .values(is_test_data=True, updated_at=_now())
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount


async def bulk_archive_test_jobs(
    db: AsyncSession,
    older_than_days: int = 7,
    module_type: Optional[str] = None,
) -> int:
    """
    Bulk-archive jobs that look like test/demo runs by setting is_test_data=True.

    Criteria (all must match):
      - status in ('completed', 'failed', 'cancelled')
      - created more than older_than_days ago
      - workspace_path is None or empty string (no durable artifacts)
      - is_test_data is already False (skip already-archived records)
      - module_type matches, if provided

    No records are hard-deleted. Returns the count of records archived.
    """
    cutoff = _now() - timedelta(days=older_than_days)
    terminal_statuses = ["completed", "failed", "cancelled"]

    stmt = (
        update(Job)
        .where(Job.status.in_(terminal_statuses))
        .where(Job.created_at < cutoff)
        .where(
            (Job.workspace_path == None) | (Job.workspace_path == "")  # noqa: E711,E712
        )
        .where(Job.is_test_data == False)  # noqa: E712
    )
    if module_type:
        stmt = stmt.where(Job.module_type == module_type)

    stmt = stmt.values(is_test_data=True, updated_at=_now())
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount


# ===========================================================================
# Phase 1.2 — State machine enforcement
# ===========================================================================

# ---------------------------------------------------------------------------
# Pure validation helpers (no DB interaction)
# ---------------------------------------------------------------------------

def validate_job_transition(current_status: str, next_status: str) -> None:
    """
    Validate a Job status transition without touching the database.

    Raises InvalidTransitionError if the transition is not permitted.
    Raises InvalidTransitionError if either status value is unknown.

    Use this when you want to check feasibility before fetching the Job row,
    or when you need to surface a validation error early without side effects.
    """
    try:
        JobStateMachine.validate(current_status, next_status)
    except ValueError as exc:
        raise InvalidTransitionError(
            entity="job",
            entity_id="<unknown>",
            from_status=current_status,
            to_status=next_status,
        ) from exc


def validate_step_transition(current_status: str, next_status: str) -> None:
    """
    Validate a JobStep status transition without touching the database.

    Raises InvalidTransitionError if the transition is not permitted.
    """
    try:
        StepStateMachine.validate(current_status, next_status)
    except ValueError as exc:
        raise InvalidTransitionError(
            entity="step",
            entity_id="<unknown>",
            from_status=current_status,
            to_status=next_status,
        ) from exc


# ---------------------------------------------------------------------------
# Job transition — validate + side effects + persist
# ---------------------------------------------------------------------------

async def transition_job_status(
    db: AsyncSession,
    job_id: str,
    next_status: str,
    *,
    last_error: Optional[str] = None,
    current_step_key: Optional[str] = None,
    elapsed_total_seconds: Optional[float] = None,
    estimated_remaining_seconds: Optional[float] = None,
) -> Job:
    """
    Transition a Job to a new status, applying canonical side effects.

    This is the SINGLE authoritative function for changing Job.status.
    No other code path should assign Job.status directly.

    Args:
        db                          : async DB session
        job_id                      : the Job to transition
        next_status                 : target JobStatus string value
        last_error                  : required when next_status is 'failed';
                                      optional for other transitions (ignored
                                      when the transition clears the error).
        current_step_key            : optionally update the active step pointer.
                                      If None, the existing value is preserved
                                      (except on 'completed', where it is cleared).
        elapsed_total_seconds       : optionally update the running total.
        estimated_remaining_seconds : optionally update the ETA.

    Returns:
        The updated and refreshed Job ORM object.

    Raises:
        JobNotFoundError       : job_id does not exist in the DB.
        InvalidTransitionError : transition not permitted by state machine.

    Side effects by target status:
        running   → started_at set (only if currently null); last_error cleared
        waiting   → no timestamp change beyond updated_at
        retrying  → retry_count incremented by 1; last_error cleared
        completed → finished_at set; current_step_key cleared; last_error cleared
        failed    → finished_at set; last_error set from argument
        cancelled → finished_at set; last_error cleared
    """
    job = await get_job(db, job_id)
    if job is None:
        raise JobNotFoundError(job_id)

    # Validate transition (raises InvalidTransitionError on failure)
    try:
        JobStateMachine.validate(job.status, next_status)
    except ValueError as exc:
        raise InvalidTransitionError(
            entity="job",
            entity_id=job_id,
            from_status=job.status,
            to_status=next_status,
        ) from exc

    now = _now()

    # Apply canonical side effects
    if next_status == "running":
        if job.started_at is None:
            job.started_at = now
        job.last_error = None

    elif next_status == "waiting":
        pass  # no timestamp side effect; updated_at handled by ORM onupdate

    elif next_status == "retrying":
        job.retry_count = (job.retry_count or 0) + 1
        job.last_error = None

    elif next_status == "completed":
        job.finished_at = now
        job.current_step_key = None
        job.last_error = None

    elif next_status == "failed":
        job.finished_at = now
        job.last_error = last_error  # may be None if caller did not provide
        # Faz 15: emit render_failure inbox item for job failures
        await emit_operation_event(
            db,
            item_type="render_failure",
            title=f"Is basarisiz: {job.module_type or 'bilinmeyen'}",
            reason=(last_error or "Bilinmeyen hata")[:200],
            priority="high",
            owner_user_id=job.owner_id,
            related_entity_type="job",
            related_entity_id=job.id,
            action_url=f"/admin/jobs/{job.id}",
        )

    elif next_status == "cancelled":
        job.finished_at = now
        job.last_error = None

    # Apply optional caller-supplied overrides
    if current_step_key is not None:
        job.current_step_key = current_step_key
    if elapsed_total_seconds is not None:
        job.elapsed_total_seconds = elapsed_total_seconds
    if estimated_remaining_seconds is not None:
        job.estimated_remaining_seconds = estimated_remaining_seconds

    # Apply status last (after all side effects are set)
    job.status = next_status

    await db.commit()
    await db.refresh(job)
    return job


# ---------------------------------------------------------------------------
# JobStep transition — validate + side effects + persist
# ---------------------------------------------------------------------------

async def transition_step_status(
    db: AsyncSession,
    job_id: str,
    step_key: str,
    next_status: str,
    *,
    last_error: Optional[str] = None,
    log_append: Optional[str] = None,
    artifact_refs_json: Optional[str] = None,
) -> JobStep:
    """
    Transition a JobStep to a new status, applying canonical side effects.

    This is the SINGLE authoritative function for changing JobStep.status.
    No other code path should assign JobStep.status directly.

    Args:
        db               : async DB session
        job_id           : parent job ID
        step_key         : the step to transition
        next_status      : target JobStepStatus string value
        last_error       : required when next_status is 'failed'.
                           Cleared (set to None) on 'retrying'.
                           Preserved unchanged for other transitions.
        log_append       : text to APPEND to the existing log_text.
                           Logs are append-only — never overwritten.
                           Pass None to leave log unchanged.
        artifact_refs_json: if provided, REPLACES the current artifact_refs_json.
                            Only update this on 'completed' (when all artifacts
                            are confirmed). Partial artifact refs during 'running'
                            should not overwrite the completed set.

    Returns:
        The updated and refreshed JobStep ORM object.

    Raises:
        StepNotFoundError      : (job_id, step_key) does not exist in the DB.
        InvalidTransitionError : transition not permitted by state machine.

    Side effects by target status:
        running   → started_at set (only if currently null)
        completed → finished_at set; elapsed_seconds calculated from started_at
        failed    → finished_at set; elapsed_seconds calculated; last_error set
        skipped   → finished_at set; elapsed_seconds NOT set (step never ran)
        retrying  → last_error cleared
    """
    step = await get_job_step(db, job_id, step_key)
    if step is None:
        raise StepNotFoundError(f"job={job_id}, step={step_key}")

    # Validate transition (raises InvalidTransitionError on failure)
    try:
        StepStateMachine.validate(step.status, next_status)
    except ValueError as exc:
        raise InvalidTransitionError(
            entity="step",
            entity_id=f"{job_id}/{step_key}",
            from_status=step.status,
            to_status=next_status,
        ) from exc

    now = _now()

    # Apply canonical side effects
    if next_status == "running":
        if step.started_at is None:
            step.started_at = now

    elif next_status == "completed":
        step.finished_at = now
        if step.started_at is not None:
            started = step.started_at
            # SQLite returns naive datetimes; make timezone-aware if needed
            if started.tzinfo is None:
                from datetime import timezone as _tz
                started = started.replace(tzinfo=_tz.utc)
            delta = (now - started).total_seconds()
            step.elapsed_seconds = round(delta, 3)

    elif next_status == "failed":
        step.finished_at = now
        if step.started_at is not None:
            started = step.started_at
            if started.tzinfo is None:
                from datetime import timezone as _tz
                started = started.replace(tzinfo=_tz.utc)
            delta = (now - started).total_seconds()
            step.elapsed_seconds = round(delta, 3)
        step.last_error = last_error

    elif next_status == "skipped":
        step.finished_at = now
        # elapsed_seconds intentionally NOT set — step never executed

    elif next_status == "retrying":
        step.last_error = None

    # Apply optional caller-supplied overrides
    if log_append is not None:
        existing = step.log_text or ""
        separator = "\n" if existing else ""
        step.log_text = existing + separator + log_append

    if artifact_refs_json is not None:
        step.artifact_refs_json = artifact_refs_json

    # Apply status last
    step.status = next_status

    await db.commit()
    await db.refresh(step)
    return step


# ---------------------------------------------------------------------------
# Convenience query helpers (used by executor in Phase 1.3+)
# ---------------------------------------------------------------------------

async def update_job_heartbeat(db: AsyncSession, job_id: str) -> None:
    """
    Update heartbeat_at to now for the given job.

    Called periodically by PipelineRunner at step boundaries so the startup
    recovery scanner can distinguish a healthy running job from a crashed one.
    This is a data field update, not a state transition — it does NOT go
    through the state-machine gateway.
    """
    job = await get_job(db, job_id)
    if job is None:
        return
    job.heartbeat_at = _now()
    await db.commit()


def is_job_terminal(status: str) -> bool:
    """Return True if the given job status has no outgoing transitions."""
    return JobStateMachine.is_terminal(status)


def is_step_terminal(status: str) -> bool:
    """Return True if the given step status has no outgoing transitions."""
    return StepStateMachine.is_terminal(status)


def allowed_next_job_statuses(current_status: str) -> list:
    """Return the list of legal next job statuses from the current status."""
    return JobStateMachine.allowed_next(current_status)


def allowed_next_step_statuses(current_status: str) -> list:
    """Return the list of legal next step statuses from the current status."""
    return StepStateMachine.allowed_next(current_status)
