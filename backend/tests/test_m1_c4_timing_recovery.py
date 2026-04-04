"""
Tests for Phase M1-C4 — Timing + Recovery.

Covers:
  - timing.py: elapsed_seconds, format_elapsed, estimate_remaining_seconds,
                step_progress_fraction
  - recovery.py: run_startup_recovery (stale job, healthy job, no jobs,
                  stale step recovery)
  - service.py: update_job_heartbeat exists and updates the field
  - schemas.py: elapsed_seconds and eta_seconds computed fields on JobResponse
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.jobs.timing import (
    elapsed_seconds,
    format_elapsed,
    estimate_remaining_seconds,
    step_progress_fraction,
)
from app.jobs.schemas import JobResponse, JobStepResponse


# ===========================================================================
# timing.py tests
# ===========================================================================

class TestElapsedSeconds:
    def test_none_when_not_started(self):
        assert elapsed_seconds(None) is None

    def test_positive_for_past_timestamp(self):
        started = datetime.now(timezone.utc) - timedelta(seconds=30)
        result = elapsed_seconds(started)
        assert result is not None
        assert 29.0 < result < 35.0  # allow a little clock variance

    def test_naive_datetime_treated_as_utc(self):
        # SQLite returns naive datetimes — the timing helper normalises them.
        # We must create the naive datetime from utcnow equivalent (strip tzinfo
        # from a UTC-aware timestamp) so the assume-UTC treatment is consistent.
        aware_now = datetime.now(timezone.utc)
        started_naive = aware_now.replace(tzinfo=None) - timedelta(seconds=10)
        result = elapsed_seconds(started_naive)
        assert result is not None
        assert 9.0 < result < 15.0

    def test_never_negative(self):
        # Started slightly in the future due to clock skew — clamp to 0
        future = datetime.now(timezone.utc) + timedelta(seconds=1)
        result = elapsed_seconds(future)
        assert result is not None
        assert result >= 0.0


class TestFormatElapsed:
    def test_seconds_only(self):
        assert format_elapsed(45.0) == "45s"

    def test_zero_seconds(self):
        assert format_elapsed(0.0) == "0s"

    def test_minutes_and_seconds(self):
        assert format_elapsed(154.0) == "2m 34s"

    def test_exactly_one_minute(self):
        assert format_elapsed(60.0) == "1m 0s"

    def test_hours_and_minutes(self):
        assert format_elapsed(4320.0) == "1h 12m"

    def test_hours_zero_minutes(self):
        assert format_elapsed(3600.0) == "1h 0m"

    def test_large_value(self):
        result = format_elapsed(7200.0)  # 2h
        assert result == "2h 0m"


class TestEstimateRemainingSeconds:
    def test_returns_none_when_no_progress(self):
        assert estimate_remaining_seconds(elapsed=60.0, progress_fraction=0.0) is None

    def test_returns_zero_when_complete(self):
        assert estimate_remaining_seconds(elapsed=60.0, progress_fraction=1.0) == 0.0

    def test_returns_zero_for_over_one_fraction(self):
        assert estimate_remaining_seconds(elapsed=60.0, progress_fraction=1.5) == 0.0

    def test_linear_projection_at_half(self):
        # 60s elapsed, 50% done → 60s remaining
        result = estimate_remaining_seconds(elapsed=60.0, progress_fraction=0.5)
        assert result is not None
        assert abs(result - 60.0) < 0.01

    def test_linear_projection_at_quarter(self):
        # 30s elapsed, 25% done → 90s remaining (total=120, done=30)
        result = estimate_remaining_seconds(elapsed=30.0, progress_fraction=0.25)
        assert result is not None
        assert abs(result - 90.0) < 0.01

    def test_never_negative(self):
        # Edge case — already-past ETA
        result = estimate_remaining_seconds(elapsed=120.0, progress_fraction=0.99)
        assert result is not None
        assert result >= 0.0


class TestStepProgressFraction:
    def test_zero_when_no_steps(self):
        assert step_progress_fraction(0, 0) == 0.0

    def test_zero_when_none_complete(self):
        assert step_progress_fraction(0, 5) == 0.0

    def test_full_when_all_complete(self):
        assert step_progress_fraction(5, 5) == 1.0

    def test_half(self):
        assert step_progress_fraction(2, 4) == 0.5

    def test_clamp_above_one(self):
        # More completed than total is nonsensical but must not crash
        assert step_progress_fraction(6, 5) == 1.0

    def test_clamp_below_zero(self):
        assert step_progress_fraction(0, 5) == 0.0


# ===========================================================================
# recovery.py tests (using mocks — no real DB)
# ===========================================================================

class TestRunStartupRecovery:
    """
    Tests for run_startup_recovery.

    Uses mocking to avoid a real DB dependency in unit tests.
    The integration test below uses the actual session.
    """

    @pytest.mark.asyncio
    async def test_no_running_jobs(self):
        """When there are no running jobs, summary is empty."""
        from app.jobs.recovery import run_startup_recovery

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=mock_result)

        summary = await run_startup_recovery(mock_db)

        assert summary.recovered_jobs == 0
        assert summary.recovered_steps == 0
        assert summary.job_ids == []

    @pytest.mark.asyncio
    async def test_healthy_job_not_recovered(self):
        """A running job with a recent heartbeat is left alone."""
        from app.jobs.recovery import run_startup_recovery
        from app.db.models import Job

        healthy_job = MagicMock(spec=Job)
        healthy_job.id = "job-healthy"
        healthy_job.status = "running"
        # heartbeat 30 seconds ago — well within the 5-minute threshold
        healthy_job.heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=30)
        healthy_job.started_at = datetime.now(timezone.utc) - timedelta(minutes=2)

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [healthy_job]
        mock_db.execute = AsyncMock(return_value=mock_result)

        summary = await run_startup_recovery(mock_db)

        assert summary.recovered_jobs == 0
        assert summary.recovered_steps == 0

    @pytest.mark.asyncio
    async def test_stale_job_recovered(self):
        """A running job with a stale heartbeat is transitioned to failed."""
        from app.jobs.recovery import run_startup_recovery
        from app.db.models import Job

        stale_job = MagicMock(spec=Job)
        stale_job.id = "job-stale"
        stale_job.status = "running"
        stale_job.heartbeat_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        stale_job.started_at = datetime.now(timezone.utc) - timedelta(minutes=15)

        # First execute call returns the running jobs list.
        # Second execute call returns empty steps list.
        first_result = MagicMock()
        first_result.scalars.return_value.all.return_value = [stale_job]

        second_result = MagicMock()
        second_result.scalars.return_value.all.return_value = []

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(side_effect=[first_result, second_result])

        with patch("app.jobs.recovery.service") as mock_service:
            mock_service.transition_job_status = AsyncMock()
            mock_service.transition_step_status = AsyncMock()

            summary = await run_startup_recovery(mock_db)

        assert summary.recovered_jobs == 1
        assert summary.recovered_steps == 0
        assert "job-stale" in summary.job_ids
        mock_service.transition_job_status.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_stale_running_step_recovered(self):
        """Steps in 'running' state on a stale job are transitioned to failed."""
        from app.jobs.recovery import run_startup_recovery
        from app.db.models import Job, JobStep

        stale_job = MagicMock(spec=Job)
        stale_job.id = "job-with-step"
        stale_job.status = "running"
        stale_job.heartbeat_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        stale_job.started_at = datetime.now(timezone.utc) - timedelta(minutes=20)

        running_step = MagicMock(spec=JobStep)
        running_step.job_id = "job-with-step"
        running_step.step_key = "script"
        running_step.status = "running"

        first_result = MagicMock()
        first_result.scalars.return_value.all.return_value = [stale_job]

        second_result = MagicMock()
        second_result.scalars.return_value.all.return_value = [running_step]

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(side_effect=[first_result, second_result])

        with patch("app.jobs.recovery.service") as mock_service:
            mock_service.transition_job_status = AsyncMock()
            mock_service.transition_step_status = AsyncMock()

            summary = await run_startup_recovery(mock_db)

        assert summary.recovered_jobs == 1
        assert summary.recovered_steps == 1
        assert "job-with-step" in summary.job_ids
        mock_service.transition_step_status.assert_awaited_once_with(
            mock_db,
            "job-with-step",
            "script",
            "failed",
            last_error=mock_service.transition_step_status.call_args.kwargs["last_error"],
        )

    @pytest.mark.asyncio
    async def test_null_heartbeat_stale_by_started_at(self):
        """A running job with no heartbeat but old started_at is also recovered."""
        from app.jobs.recovery import run_startup_recovery
        from app.db.models import Job

        stale_job = MagicMock(spec=Job)
        stale_job.id = "job-no-heartbeat"
        stale_job.status = "running"
        stale_job.heartbeat_at = None
        stale_job.started_at = datetime.now(timezone.utc) - timedelta(minutes=10)

        first_result = MagicMock()
        first_result.scalars.return_value.all.return_value = [stale_job]

        second_result = MagicMock()
        second_result.scalars.return_value.all.return_value = []

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(side_effect=[first_result, second_result])

        with patch("app.jobs.recovery.service") as mock_service:
            mock_service.transition_job_status = AsyncMock()
            mock_service.transition_step_status = AsyncMock()

            summary = await run_startup_recovery(mock_db)

        assert summary.recovered_jobs == 1
        assert "job-no-heartbeat" in summary.job_ids

    @pytest.mark.asyncio
    async def test_custom_threshold(self):
        """STALE_THRESHOLD is configurable — a 1-minute threshold catches 2-min-old jobs."""
        from app.jobs.recovery import run_startup_recovery
        from app.db.models import Job

        stale_job = MagicMock(spec=Job)
        stale_job.id = "job-two-mins"
        stale_job.status = "running"
        stale_job.heartbeat_at = datetime.now(timezone.utc) - timedelta(minutes=2)
        stale_job.started_at = datetime.now(timezone.utc) - timedelta(minutes=3)

        first_result = MagicMock()
        first_result.scalars.return_value.all.return_value = [stale_job]

        second_result = MagicMock()
        second_result.scalars.return_value.all.return_value = []

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(side_effect=[first_result, second_result])

        with patch("app.jobs.recovery.service") as mock_service:
            mock_service.transition_job_status = AsyncMock()

            summary = await run_startup_recovery(mock_db, stale_threshold_minutes=1)

        assert summary.recovered_jobs == 1

    @pytest.mark.asyncio
    async def test_custom_threshold_does_not_catch_fresh_job(self):
        """A 1-minute threshold should NOT catch a 30-second-old job."""
        from app.jobs.recovery import run_startup_recovery
        from app.db.models import Job

        fresh_job = MagicMock(spec=Job)
        fresh_job.id = "job-fresh"
        fresh_job.status = "running"
        fresh_job.heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=30)
        fresh_job.started_at = datetime.now(timezone.utc) - timedelta(seconds=30)

        first_result = MagicMock()
        first_result.scalars.return_value.all.return_value = [fresh_job]

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=first_result)

        summary = await run_startup_recovery(mock_db, stale_threshold_minutes=1)

        assert summary.recovered_jobs == 0


# ===========================================================================
# service.py: update_job_heartbeat
# ===========================================================================

class TestUpdateJobHeartbeat:
    def test_update_job_heartbeat_exists_in_service(self):
        """Verify the function is exported from service.py."""
        from app.jobs import service
        assert hasattr(service, "update_job_heartbeat")
        assert callable(service.update_job_heartbeat)

    @pytest.mark.asyncio
    async def test_update_job_heartbeat_updates_field(self):
        """update_job_heartbeat sets heartbeat_at to now."""
        from app.jobs.service import update_job_heartbeat
        from app.db.models import Job

        mock_job = MagicMock(spec=Job)
        mock_job.heartbeat_at = None

        mock_db = AsyncMock()

        with patch("app.jobs.service.get_job", return_value=mock_job) as _mock_get:
            await update_job_heartbeat(mock_db, "job-abc")

        # heartbeat_at should now be set to a datetime
        assert mock_job.heartbeat_at is not None
        assert isinstance(mock_job.heartbeat_at, datetime)
        mock_db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_job_heartbeat_noop_if_not_found(self):
        """update_job_heartbeat does nothing if the job does not exist."""
        from app.jobs.service import update_job_heartbeat

        mock_db = AsyncMock()

        with patch("app.jobs.service.get_job", return_value=None):
            # Should not raise
            await update_job_heartbeat(mock_db, "missing-id")

        mock_db.commit.assert_not_awaited()


# ===========================================================================
# schemas.py: computed timing fields
# ===========================================================================

class TestJobResponseTimingFields:
    def _make_step(self, status: str = "completed", elapsed: float | None = 5.0) -> dict:
        return {
            "id": "step-1",
            "job_id": "job-1",
            "step_key": "script",
            "step_order": 0,
            "status": status,
            "elapsed_seconds": elapsed,
            "created_at": datetime.now(timezone.utc),
            "started_at": datetime.now(timezone.utc) - timedelta(seconds=5),
            "finished_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def test_elapsed_seconds_computed_for_running_job(self):
        now = datetime.now(timezone.utc)
        response = JobResponse(
            id="job-1",
            module_type="standard_video",
            status="running",
            retry_count=0,
            created_at=now,
            started_at=now - timedelta(seconds=60),
            updated_at=now,
        )
        assert response.elapsed_seconds is not None
        assert response.elapsed_seconds >= 59.0

    def test_elapsed_seconds_from_stored_total_for_completed_job(self):
        now = datetime.now(timezone.utc)
        response = JobResponse(
            id="job-1",
            module_type="standard_video",
            status="completed",
            retry_count=0,
            elapsed_total_seconds=120.0,
            created_at=now,
            started_at=now - timedelta(seconds=120),
            finished_at=now,
            updated_at=now,
        )
        assert response.elapsed_seconds == 120.0

    def test_eta_seconds_computed_when_running_with_steps(self):
        now = datetime.now(timezone.utc)
        step_data = self._make_step(status="completed")
        pending_step = {
            "id": "step-2",
            "job_id": "job-1",
            "step_key": "tts",
            "step_order": 1,
            "status": "pending",
            "elapsed_seconds": None,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
            "updated_at": now,
        }
        response = JobResponse(
            id="job-1",
            module_type="standard_video",
            status="running",
            retry_count=0,
            created_at=now,
            started_at=now - timedelta(seconds=60),
            updated_at=now,
            steps=[JobStepResponse(**step_data), JobStepResponse(**pending_step)],
        )
        # 1 of 2 steps done → fraction 0.5 → eta ≈ 60s
        assert response.eta_seconds is not None
        assert response.eta_seconds > 0

    def test_eta_seconds_none_when_no_steps(self):
        now = datetime.now(timezone.utc)
        response = JobResponse(
            id="job-1",
            module_type="standard_video",
            status="running",
            retry_count=0,
            created_at=now,
            started_at=now - timedelta(seconds=60),
            updated_at=now,
            steps=[],
        )
        assert response.eta_seconds is None

    def test_eta_seconds_none_for_completed_job(self):
        now = datetime.now(timezone.utc)
        response = JobResponse(
            id="job-1",
            module_type="standard_video",
            status="completed",
            retry_count=0,
            elapsed_total_seconds=60.0,
            created_at=now,
            started_at=now - timedelta(seconds=60),
            finished_at=now,
            updated_at=now,
        )
        assert response.eta_seconds is None

    def test_step_elapsed_seconds_live_for_running_step(self):
        now = datetime.now(timezone.utc)
        step = JobStepResponse(
            id="step-1",
            job_id="job-1",
            step_key="script",
            step_order=0,
            status="running",
            elapsed_seconds=None,  # not yet persisted
            created_at=now,
            started_at=now - timedelta(seconds=30),
            finished_at=None,
            updated_at=now,
        )
        assert step.elapsed_seconds_live is not None
        assert step.elapsed_seconds_live >= 29.0

    def test_step_elapsed_seconds_live_uses_stored_for_completed(self):
        now = datetime.now(timezone.utc)
        step = JobStepResponse(
            id="step-1",
            job_id="job-1",
            step_key="script",
            step_order=0,
            status="completed",
            elapsed_seconds=42.5,
            created_at=now,
            started_at=now - timedelta(seconds=42),
            finished_at=now,
            updated_at=now,
        )
        assert step.elapsed_seconds_live == 42.5
