"""Tests for app.jobs.timing — historical ETA and enrichment."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone, timedelta

from app.jobs.timing import (
    compute_historical_eta,
    enrich_job_eta,
)


# ---------------------------------------------------------------------------
# compute_historical_eta
# ---------------------------------------------------------------------------


class TestComputeHistoricalEta:
    def test_no_steps_returns_zero(self):
        result = compute_historical_eta(
            elapsed=10.0,
            completed_steps=0,
            total_steps=0,
            remaining_step_keys=[],
            historical_averages={},
        )
        assert result == 0.0

    def test_all_steps_completed(self):
        result = compute_historical_eta(
            elapsed=30.0,
            completed_steps=3,
            total_steps=3,
            remaining_step_keys=[],
            historical_averages={"a": 10.0, "b": 10.0, "c": 10.0},
        )
        assert result == 0.0

    def test_historical_data_available(self):
        result = compute_historical_eta(
            elapsed=20.0,
            completed_steps=2,
            total_steps=5,
            remaining_step_keys=["c", "d", "e"],
            historical_averages={"c": 10.0, "d": 15.0, "e": 5.0},
        )
        # Sum of remaining = 10 + 15 + 5 = 30
        assert result == 30.0

    def test_partial_historical_data(self):
        result = compute_historical_eta(
            elapsed=20.0,
            completed_steps=1,
            total_steps=4,
            remaining_step_keys=["b", "c", "d"],
            historical_averages={"b": 12.0, "c": 8.0},
            # "d" has no history — avg of known = (12+8)/2 = 10 → total = 12+8+10 = 30
        )
        assert result == 30.0

    def test_no_historical_data_falls_back_to_linear(self):
        result = compute_historical_eta(
            elapsed=30.0,
            completed_steps=1,
            total_steps=3,
            remaining_step_keys=["b", "c"],
            historical_averages={},
        )
        # Linear: fraction=1/3, total_est=90, remaining=60
        assert result == pytest.approx(60.0)


# ---------------------------------------------------------------------------
# enrich_job_eta
# ---------------------------------------------------------------------------


def _make_step(step_key, status, elapsed_live=None):
    step = MagicMock()
    step.step_key = step_key
    step.status = status
    step.elapsed_seconds_live = elapsed_live
    step.eta_seconds = None
    return step


def _make_job_response(status, module_type, elapsed, steps):
    job = MagicMock()
    job.status = status
    job.module_type = module_type
    job.elapsed_seconds = elapsed
    job.steps = steps
    job.eta_seconds = None
    return job


class TestEnrichJobEta:
    @pytest.mark.asyncio
    async def test_skips_non_running_jobs(self):
        db = AsyncMock()
        job = _make_job_response("completed", "standard_video", 100.0, [])
        await enrich_job_eta(db, job)
        assert job.eta_seconds is None

    @pytest.mark.asyncio
    async def test_skips_when_no_steps(self):
        db = AsyncMock()
        job = _make_job_response("running", "standard_video", 10.0, [])
        await enrich_job_eta(db, job)
        assert job.eta_seconds is None

    @pytest.mark.asyncio
    async def test_skips_when_no_elapsed(self):
        db = AsyncMock()
        step = _make_step("script", "running", 5.0)
        job = _make_job_response("running", "standard_video", None, [step])
        await enrich_job_eta(db, job)
        assert job.eta_seconds is None

    @pytest.mark.asyncio
    async def test_enriches_job_eta_with_history(self, monkeypatch):
        async def mock_get_averages(db, module_type):
            return {"script": 10.0, "metadata": 8.0, "tts": 15.0}

        monkeypatch.setattr(
            "app.jobs.timing.get_historical_step_averages",
            mock_get_averages,
        )

        step1 = _make_step("script", "completed")
        step2 = _make_step("metadata", "running", 3.0)
        step3 = _make_step("tts", "pending")

        job = _make_job_response("running", "standard_video", 13.0, [step1, step2, step3])

        db = AsyncMock()
        await enrich_job_eta(db, job)

        # Remaining: metadata(8) + tts(15) = 23
        assert job.eta_seconds == 23.0

    @pytest.mark.asyncio
    async def test_enriches_step_eta_for_running_step(self, monkeypatch):
        async def mock_get_averages(db, module_type):
            return {"script": 10.0, "metadata": 8.0}

        monkeypatch.setattr(
            "app.jobs.timing.get_historical_step_averages",
            mock_get_averages,
        )

        step1 = _make_step("script", "completed")
        step2 = _make_step("metadata", "running", 3.0)

        job = _make_job_response("running", "standard_video", 13.0, [step1, step2])

        db = AsyncMock()
        await enrich_job_eta(db, job)

        # Step ETA: avg(8) - elapsed_live(3) = 5
        assert step2.eta_seconds == 5.0

    @pytest.mark.asyncio
    async def test_no_history_keeps_linear_estimate(self, monkeypatch):
        async def mock_get_averages(db, module_type):
            return {}

        monkeypatch.setattr(
            "app.jobs.timing.get_historical_step_averages",
            mock_get_averages,
        )

        step1 = _make_step("script", "running", 5.0)
        job = _make_job_response("running", "standard_video", 5.0, [step1])
        job.eta_seconds = 42.0  # Pre-existing linear estimate

        db = AsyncMock()
        await enrich_job_eta(db, job)

        # Should not overwrite — no historical data
        assert job.eta_seconds == 42.0
