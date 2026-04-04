"""
Tests — Phase 1.2: State Machine Enforcement

Covers:
  A) validate_job_transition — valid transitions accepted
  B) validate_job_transition — invalid transitions raise InvalidTransitionError
  C) validate_step_transition — valid transitions accepted
  D) validate_step_transition — invalid transitions raise InvalidTransitionError
  E) transition_job_status — valid: queued→running (side effects)
  F) transition_job_status — valid: running→completed (side effects)
  G) transition_job_status — valid: running→failed (side effects)
  H) transition_job_status — valid: running→retrying (retry_count increment)
  I) transition_job_status — valid: running→cancelled (side effects)
  J) transition_job_status — valid: running→waiting (no timestamp change)
  K) transition_job_status — invalid transition raises InvalidTransitionError
  L) transition_job_status — unknown job_id raises JobNotFoundError
  M) transition_job_status — terminal state rejects further transitions
  N) transition_step_status — valid: pending→running (side effects)
  O) transition_step_status — valid: running→completed (elapsed_seconds)
  P) transition_step_status — valid: running→failed (elapsed_seconds, last_error)
  Q) transition_step_status — valid: running→skipped (no elapsed)
  R) transition_step_status — valid: running→retrying (last_error cleared)
  S) transition_step_status — invalid transition raises InvalidTransitionError
  T) transition_step_status — unknown step raises StepNotFoundError
  U) transition_step_status — log_append is append-only
  V) transition_step_status — artifact_refs_json replace on completed
  W) retry_count increments correctly across multiple retrying transitions
  X) started_at not overwritten on second running transition
  Y) is_job_terminal / is_step_terminal helpers
  Z) allowed_next helpers
"""

import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

from app.db.session import AsyncSessionLocal
from app.db.models import Job, JobStep
from app.jobs import service
from app.jobs.exceptions import (
    InvalidTransitionError,
    JobNotFoundError,
    StepNotFoundError,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_job_direct(db, module_type="standard_video", status="queued") -> Job:
    """Create a Job record directly (bypasses HTTP layer for speed)."""
    job = Job(
        module_type=module_type,
        status=status,
        retry_count=0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def _create_step_direct(
    db,
    job_id: str,
    step_key: str = "script",
    step_order: int = 1,
    status: str = "pending",
) -> JobStep:
    step = JobStep(
        job_id=job_id,
        step_key=step_key,
        step_order=step_order,
        status=status,
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


@pytest.fixture
async def db():
    async with AsyncSessionLocal() as session:
        yield session


# ===========================================================================
# A) validate_job_transition — valid transitions
# ===========================================================================

class TestValidateJobTransitionValid:
    def test_queued_to_running(self):
        service.validate_job_transition("queued", "running")  # no exception

    def test_queued_to_cancelled(self):
        service.validate_job_transition("queued", "cancelled")

    def test_running_to_completed(self):
        service.validate_job_transition("running", "completed")

    def test_running_to_failed(self):
        service.validate_job_transition("running", "failed")

    def test_running_to_waiting(self):
        service.validate_job_transition("running", "waiting")

    def test_running_to_retrying(self):
        service.validate_job_transition("running", "retrying")

    def test_running_to_cancelled(self):
        service.validate_job_transition("running", "cancelled")

    def test_waiting_to_running(self):
        service.validate_job_transition("waiting", "running")

    def test_retrying_to_running(self):
        service.validate_job_transition("retrying", "running")

    def test_retrying_to_failed(self):
        service.validate_job_transition("retrying", "failed")


# ===========================================================================
# B) validate_job_transition — invalid transitions
# ===========================================================================

class TestValidateJobTransitionInvalid:
    def test_queued_to_completed_raises(self):
        with pytest.raises(InvalidTransitionError) as exc_info:
            service.validate_job_transition("queued", "completed")
        assert exc_info.value.entity == "job"
        assert exc_info.value.from_status == "queued"
        assert exc_info.value.to_status == "completed"

    def test_completed_to_running_raises(self):
        with pytest.raises(InvalidTransitionError):
            service.validate_job_transition("completed", "running")

    def test_failed_to_running_raises(self):
        with pytest.raises(InvalidTransitionError):
            service.validate_job_transition("failed", "running")

    def test_cancelled_to_running_raises(self):
        with pytest.raises(InvalidTransitionError):
            service.validate_job_transition("cancelled", "running")

    def test_queued_to_failed_raises(self):
        with pytest.raises(InvalidTransitionError):
            service.validate_job_transition("queued", "failed")

    def test_unknown_status_raises(self):
        with pytest.raises(InvalidTransitionError):
            service.validate_job_transition("banana", "running")


# ===========================================================================
# C) validate_step_transition — valid transitions
# ===========================================================================

class TestValidateStepTransitionValid:
    def test_pending_to_running(self):
        service.validate_step_transition("pending", "running")

    def test_pending_to_skipped(self):
        service.validate_step_transition("pending", "skipped")

    def test_running_to_completed(self):
        service.validate_step_transition("running", "completed")

    def test_running_to_failed(self):
        service.validate_step_transition("running", "failed")

    def test_running_to_retrying(self):
        service.validate_step_transition("running", "retrying")

    def test_retrying_to_running(self):
        service.validate_step_transition("retrying", "running")

    def test_retrying_to_failed(self):
        service.validate_step_transition("retrying", "failed")


# ===========================================================================
# D) validate_step_transition — invalid transitions
# ===========================================================================

class TestValidateStepTransitionInvalid:
    def test_pending_to_completed_raises(self):
        with pytest.raises(InvalidTransitionError) as exc_info:
            service.validate_step_transition("pending", "completed")
        assert exc_info.value.entity == "step"

    def test_completed_to_running_raises(self):
        with pytest.raises(InvalidTransitionError):
            service.validate_step_transition("completed", "running")

    def test_failed_to_running_raises(self):
        with pytest.raises(InvalidTransitionError):
            service.validate_step_transition("failed", "running")

    def test_skipped_to_running_raises(self):
        with pytest.raises(InvalidTransitionError):
            service.validate_step_transition("skipped", "running")


# ===========================================================================
# E–M) transition_job_status — DB-backed tests
# ===========================================================================

class TestTransitionJobStatus:

    @pytest.mark.asyncio
    async def test_queued_to_running_side_effects(self, db):
        """E: queued→running sets started_at, clears last_error."""
        job = await _create_job_direct(db)
        assert job.started_at is None
        assert job.status == "queued"

        updated = await service.transition_job_status(db, job.id, "running")

        assert updated.status == "running"
        assert updated.started_at is not None
        assert updated.last_error is None
        assert updated.finished_at is None

    @pytest.mark.asyncio
    async def test_running_to_completed_side_effects(self, db):
        """F: running→completed sets finished_at, clears current_step_key and last_error."""
        job = await _create_job_direct(db, status="running")
        job.current_step_key = "script"
        job.last_error = "some previous error"
        await db.commit()

        updated = await service.transition_job_status(db, job.id, "completed")

        assert updated.status == "completed"
        assert updated.finished_at is not None
        assert updated.current_step_key is None
        assert updated.last_error is None

    @pytest.mark.asyncio
    async def test_running_to_failed_side_effects(self, db):
        """G: running→failed sets finished_at, sets last_error from argument."""
        job = await _create_job_direct(db, status="running")

        updated = await service.transition_job_status(
            db, job.id, "failed", last_error="TTS provider timeout"
        )

        assert updated.status == "failed"
        assert updated.finished_at is not None
        assert updated.last_error == "TTS provider timeout"

    @pytest.mark.asyncio
    async def test_running_to_retrying_increments_retry_count(self, db):
        """H: running→retrying increments retry_count, clears last_error."""
        job = await _create_job_direct(db, status="running")
        job.last_error = "previous error"
        await db.commit()

        updated = await service.transition_job_status(db, job.id, "retrying")

        assert updated.status == "retrying"
        assert updated.retry_count == 1
        assert updated.last_error is None

    @pytest.mark.asyncio
    async def test_retrying_to_running_increments_again(self, db):
        """W: second retry further increments retry_count."""
        job = await _create_job_direct(db, status="running")
        await service.transition_job_status(db, job.id, "retrying")
        await service.transition_job_status(db, job.id, "running")
        updated = await service.transition_job_status(db, job.id, "retrying")
        assert updated.retry_count == 2

    @pytest.mark.asyncio
    async def test_running_to_cancelled_side_effects(self, db):
        """I: running→cancelled sets finished_at, clears last_error."""
        job = await _create_job_direct(db, status="running")
        job.last_error = "user cancelled"
        await db.commit()

        updated = await service.transition_job_status(db, job.id, "cancelled")

        assert updated.status == "cancelled"
        assert updated.finished_at is not None
        assert updated.last_error is None

    @pytest.mark.asyncio
    async def test_running_to_waiting_no_timestamp_change(self, db):
        """J: running→waiting does not set finished_at."""
        job = await _create_job_direct(db, status="running")

        updated = await service.transition_job_status(db, job.id, "waiting")

        assert updated.status == "waiting"
        assert updated.finished_at is None

    @pytest.mark.asyncio
    async def test_invalid_transition_raises(self, db):
        """K: invalid transition raises InvalidTransitionError with correct entity info."""
        job = await _create_job_direct(db, status="queued")

        with pytest.raises(InvalidTransitionError) as exc_info:
            await service.transition_job_status(db, job.id, "completed")

        err = exc_info.value
        assert err.entity == "job"
        assert err.entity_id == job.id
        assert err.from_status == "queued"
        assert err.to_status == "completed"

    @pytest.mark.asyncio
    async def test_unknown_job_id_raises(self, db):
        """L: non-existent job_id raises JobNotFoundError."""
        with pytest.raises(JobNotFoundError) as exc_info:
            await service.transition_job_status(db, "no-such-id", "running")
        assert "no-such-id" in exc_info.value.job_id

    @pytest.mark.asyncio
    async def test_terminal_completed_rejects_further_transition(self, db):
        """M: completed is terminal — no further transition allowed."""
        job = await _create_job_direct(db, status="running")
        await service.transition_job_status(db, job.id, "completed")

        with pytest.raises(InvalidTransitionError):
            await service.transition_job_status(db, job.id, "running")

    @pytest.mark.asyncio
    async def test_terminal_failed_rejects_further_transition(self, db):
        """M: failed is terminal — no further transition allowed."""
        job = await _create_job_direct(db, status="running")
        await service.transition_job_status(db, job.id, "failed", last_error="err")

        with pytest.raises(InvalidTransitionError):
            await service.transition_job_status(db, job.id, "running")

    @pytest.mark.asyncio
    async def test_started_at_not_overwritten_on_second_running(self, db):
        """X: started_at is set once (first running) and not overwritten."""
        job = await _create_job_direct(db, status="queued")
        after_first = await service.transition_job_status(db, job.id, "running")
        first_started = after_first.started_at

        # waiting → running again
        await service.transition_job_status(db, job.id, "waiting")
        after_second = await service.transition_job_status(db, job.id, "running")

        assert after_second.started_at == first_started

    @pytest.mark.asyncio
    async def test_current_step_key_updated_via_kwarg(self, db):
        """current_step_key is updated when supplied."""
        job = await _create_job_direct(db, status="queued")
        updated = await service.transition_job_status(
            db, job.id, "running", current_step_key="script"
        )
        assert updated.current_step_key == "script"

    @pytest.mark.asyncio
    async def test_elapsed_total_seconds_updated_via_kwarg(self, db):
        """elapsed_total_seconds is updated when supplied."""
        job = await _create_job_direct(db, status="queued")
        updated = await service.transition_job_status(
            db, job.id, "running", elapsed_total_seconds=12.5
        )
        assert updated.elapsed_total_seconds == 12.5


# ===========================================================================
# N–V) transition_step_status — DB-backed tests
# ===========================================================================

class TestTransitionStepStatus:

    @pytest.mark.asyncio
    async def test_pending_to_running_sets_started_at(self, db):
        """N: pending→running sets started_at."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id)

        updated = await service.transition_step_status(db, job.id, "script", "running")

        assert updated.status == "running"
        assert updated.started_at is not None
        assert updated.finished_at is None

    @pytest.mark.asyncio
    async def test_running_to_completed_calculates_elapsed(self, db):
        """O: running→completed sets finished_at and calculates elapsed_seconds."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id, status="running")
        # Simulate started_at slightly in the past
        past = datetime.now(timezone.utc) - timedelta(seconds=5)
        step.started_at = past
        await db.commit()

        updated = await service.transition_step_status(db, job.id, "script", "completed")

        assert updated.status == "completed"
        assert updated.finished_at is not None
        assert updated.elapsed_seconds is not None
        assert updated.elapsed_seconds >= 5.0

    @pytest.mark.asyncio
    async def test_running_to_failed_sets_error_and_elapsed(self, db):
        """P: running→failed sets finished_at, elapsed_seconds, last_error."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id, status="running")
        past = datetime.now(timezone.utc) - timedelta(seconds=3)
        step.started_at = past
        await db.commit()

        updated = await service.transition_step_status(
            db, job.id, "script", "failed", last_error="LLM API error"
        )

        assert updated.status == "failed"
        assert updated.finished_at is not None
        assert updated.elapsed_seconds is not None
        assert updated.last_error == "LLM API error"

    @pytest.mark.asyncio
    async def test_running_to_skipped_no_elapsed(self, db):
        """Q: running→skipped sets finished_at but NOT elapsed_seconds."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id, status="pending")
        # skip from pending (step never ran)
        updated = await service.transition_step_status(db, job.id, "script", "skipped")

        assert updated.status == "skipped"
        assert updated.finished_at is not None
        assert updated.elapsed_seconds is None

    @pytest.mark.asyncio
    async def test_running_to_retrying_clears_last_error(self, db):
        """R: running→retrying clears last_error."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id, status="running")
        step.last_error = "previous LLM error"
        await db.commit()

        updated = await service.transition_step_status(db, job.id, "script", "retrying")

        assert updated.status == "retrying"
        assert updated.last_error is None

    @pytest.mark.asyncio
    async def test_invalid_step_transition_raises(self, db):
        """S: invalid step transition raises InvalidTransitionError."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id, status="pending")

        with pytest.raises(InvalidTransitionError) as exc_info:
            await service.transition_step_status(db, job.id, "script", "completed")

        err = exc_info.value
        assert err.entity == "step"
        assert err.from_status == "pending"
        assert err.to_status == "completed"

    @pytest.mark.asyncio
    async def test_unknown_step_raises(self, db):
        """T: non-existent step raises StepNotFoundError."""
        job = await _create_job_direct(db)

        with pytest.raises(StepNotFoundError):
            await service.transition_step_status(db, job.id, "no_such_step", "running")

    @pytest.mark.asyncio
    async def test_log_append_is_append_only(self, db):
        """U: log_append adds to existing log, never overwrites."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id, status="running")
        step.log_text = "First line"
        await db.commit()

        # Retrying keeps log intact (adds to it)
        updated = await service.transition_step_status(
            db, job.id, "script", "retrying", log_append="Retry scheduled"
        )

        assert "First line" in updated.log_text
        assert "Retry scheduled" in updated.log_text

    @pytest.mark.asyncio
    async def test_artifact_refs_json_replaced_on_completed(self, db):
        """V: artifact_refs_json is replaced (not appended) when provided."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id, status="running")
        step.artifact_refs_json = '["old.json"]'
        await db.commit()

        updated = await service.transition_step_status(
            db, job.id, "script", "completed",
            artifact_refs_json='["new_final.json"]'
        )

        assert updated.artifact_refs_json == '["new_final.json"]'

    @pytest.mark.asyncio
    async def test_started_at_not_overwritten_on_step(self, db):
        """X (step): started_at set once and not overwritten."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id)

        after_first = await service.transition_step_status(db, job.id, "script", "running")
        first_started = after_first.started_at

        # retrying → running again
        await service.transition_step_status(db, job.id, "script", "retrying")
        after_second = await service.transition_step_status(db, job.id, "script", "running")

        assert after_second.started_at == first_started

    @pytest.mark.asyncio
    async def test_terminal_completed_step_rejects_further(self, db):
        """completed step is terminal."""
        job = await _create_job_direct(db)
        step = await _create_step_direct(db, job.id, status="running")
        await service.transition_step_status(db, job.id, "script", "completed")

        with pytest.raises(InvalidTransitionError):
            await service.transition_step_status(db, job.id, "script", "running")


# ===========================================================================
# Y) is_terminal helpers
# ===========================================================================

class TestTerminalHelpers:
    def test_job_completed_is_terminal(self):
        assert service.is_job_terminal("completed") is True

    def test_job_failed_is_terminal(self):
        assert service.is_job_terminal("failed") is True

    def test_job_cancelled_is_terminal(self):
        assert service.is_job_terminal("cancelled") is True

    def test_job_queued_not_terminal(self):
        assert service.is_job_terminal("queued") is False

    def test_job_running_not_terminal(self):
        assert service.is_job_terminal("running") is False

    def test_step_completed_is_terminal(self):
        assert service.is_step_terminal("completed") is True

    def test_step_failed_is_terminal(self):
        assert service.is_step_terminal("failed") is True

    def test_step_skipped_is_terminal(self):
        assert service.is_step_terminal("skipped") is True

    def test_step_pending_not_terminal(self):
        assert service.is_step_terminal("pending") is False


# ===========================================================================
# Z) allowed_next helpers
# ===========================================================================

class TestAllowedNextHelpers:
    def test_queued_allowed_next(self):
        allowed = service.allowed_next_job_statuses("queued")
        assert "running" in allowed
        assert "cancelled" in allowed
        assert "completed" not in allowed

    def test_completed_allowed_next_empty(self):
        assert service.allowed_next_job_statuses("completed") == []

    def test_pending_step_allowed_next(self):
        allowed = service.allowed_next_step_statuses("pending")
        assert "running" in allowed
        assert "skipped" in allowed
        assert "completed" not in allowed

    def test_completed_step_allowed_next_empty(self):
        assert service.allowed_next_step_statuses("completed") == []


# ===========================================================================
# Smoke: existing jobs API endpoints still work after Phase 1.2 changes
# ===========================================================================

class TestJobsApiSmoke:
    @pytest.mark.asyncio
    async def test_create_job_still_queued(self, client: AsyncClient):
        """M2-C6: Yeni POST /jobs payloadı module_id + topic zorunlu."""
        response = await client.post(
            "/api/v1/jobs",
            json={"module_id": "standard_video", "topic": "Test konusu"},
        )
        assert response.status_code == 201
        assert response.json()["status"] == "queued"

    @pytest.mark.asyncio
    async def test_list_jobs_still_works(self, client: AsyncClient):
        response = await client.get("/api/v1/jobs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_get_job_not_found_still_404(self, client: AsyncClient):
        response = await client.get("/api/v1/jobs/no-such-job")
        assert response.status_code == 404
