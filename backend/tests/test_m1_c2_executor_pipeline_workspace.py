"""
Tests — M1-C2: Executor + Pipeline Runner + Workspace

Covers:
  A) Workspace — create_job_workspace creates correct directory structure
  B) Workspace — paths are correct without creating directories
  C) Workspace — cleanup_tmp removes contents but keeps directory
  D) Workspace — get_workspace_root returns configured root
  E) Workspace — set_workspace_root overrides root
  F) StepExecutor — ABC cannot be instantiated directly
  G) StepExecutor — concrete subclass satisfies contract
  H) StepExecutionError — attributes set correctly
  I) Gateway — invalid transition raises InvalidTransitionError (re-uses service)
  J) PipelineRunner — happy path: queued job runs all steps, ends completed
  K) PipelineRunner — step failure: job transitions to failed, stops pipeline
  L) PipelineRunner — no executor registered: step fails, job fails
  M) PipelineRunner — heartbeat_at updated after step
  N) PipelineRunner — provider_trace_json stored on step completion
  O) PipelineRunner — job not found raises JobNotFoundError
"""

import json
import tempfile
from pathlib import Path

import pytest

from app.db.session import AsyncSessionLocal
from app.db.models import Job, JobStep
from app.jobs import service
from app.jobs import workspace as ws
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import (
    JobNotFoundError,
    InvalidTransitionError,
    StepExecutionError,
)
from app.jobs.pipeline import PipelineRunner


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

async def _create_job(db, status: str = "queued") -> Job:
    job = Job(module_type="standard_video", status=status, retry_count=0)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def _create_step(
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


# ---------------------------------------------------------------------------
# Minimal concrete executor for testing
# ---------------------------------------------------------------------------

class _OkExecutor(StepExecutor):
    """Always succeeds and returns a minimal result dict."""

    def __init__(self, step_key_name: str):
        self._step_key_name = step_key_name

    def step_key(self) -> str:
        return self._step_key_name

    async def execute(self, job: Job, step: JobStep) -> dict:
        return {"status": "ok", "step": step.step_key}


class _FailExecutor(StepExecutor):
    """Always raises StepExecutionError."""

    def __init__(self, step_key_name: str):
        self._step_key_name = step_key_name

    def step_key(self) -> str:
        return self._step_key_name

    async def execute(self, job: Job, step: JobStep) -> dict:
        raise StepExecutionError(step.step_key, "simulated failure")


# ===========================================================================
# A) Workspace — create_job_workspace creates correct directory structure
# ===========================================================================

class TestWorkspaceCreate:
    def test_creates_artifacts_dir(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        root = ws.create_job_workspace("job-abc")
        assert (root / "artifacts").is_dir()

    def test_creates_preview_dir(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        root = ws.create_job_workspace("job-abc")
        assert (root / "preview").is_dir()

    def test_creates_tmp_dir(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        root = ws.create_job_workspace("job-abc")
        assert (root / "tmp").is_dir()

    def test_returns_workspace_root_path(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        root = ws.create_job_workspace("job-xyz")
        assert root == tmp_path / "job-xyz"

    def test_idempotent_on_second_call(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        ws.create_job_workspace("job-idem")
        root = ws.create_job_workspace("job-idem")  # second call — should not raise
        assert (root / "artifacts").is_dir()


# ===========================================================================
# B) Workspace — path helpers (no creation)
# ===========================================================================

class TestWorkspacePaths:
    def test_get_workspace_path(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        p = ws.get_workspace_path("job-1")
        assert p == tmp_path / "job-1"
        assert not p.exists()  # not created

    def test_get_artifact_path(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        p = ws.get_artifact_path("job-1", "audio.mp3")
        assert p == tmp_path / "job-1" / "artifacts" / "audio.mp3"

    def test_get_preview_path(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        p = ws.get_preview_path("job-1", "thumb.jpg")
        assert p == tmp_path / "job-1" / "preview" / "thumb.jpg"

    def test_get_tmp_path(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        p = ws.get_tmp_path("job-1", "intermediate.wav")
        assert p == tmp_path / "job-1" / "tmp" / "intermediate.wav"


# ===========================================================================
# C) Workspace — cleanup_tmp
# ===========================================================================

class TestWorkspaceCleanupTmp:
    def test_removes_files_in_tmp(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        root = ws.create_job_workspace("job-clean")
        tmp_file = root / "tmp" / "data.bin"
        tmp_file.write_bytes(b"data")
        assert tmp_file.exists()
        ws.cleanup_tmp("job-clean")
        assert not tmp_file.exists()

    def test_preserves_tmp_dir_itself(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        ws.create_job_workspace("job-clean2")
        ws.cleanup_tmp("job-clean2")
        assert (tmp_path / "job-clean2" / "tmp").is_dir()

    def test_noop_if_tmp_not_exist(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        # no workspace created — should not raise
        ws.cleanup_tmp("job-nonexistent")

    def test_removes_subdirs_in_tmp(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        root = ws.create_job_workspace("job-subdir")
        sub = root / "tmp" / "subdir"
        sub.mkdir()
        (sub / "file.txt").write_text("x")
        ws.cleanup_tmp("job-subdir")
        assert not sub.exists()


# ===========================================================================
# D/E) Workspace root configuration
# ===========================================================================

class TestWorkspaceRoot:
    def test_set_and_get_root(self, tmp_path):
        ws.set_workspace_root(tmp_path / "custom")
        assert ws.get_workspace_root() == tmp_path / "custom"

    def test_paths_reflect_root_change(self, tmp_path):
        new_root = tmp_path / "newroot"
        ws.set_workspace_root(new_root)
        p = ws.get_workspace_path("job-1")
        assert p == new_root / "job-1"


# ===========================================================================
# F/G) StepExecutor ABC
# ===========================================================================

class TestStepExecutorABC:
    def test_cannot_instantiate_abstract_class(self):
        with pytest.raises(TypeError):
            StepExecutor()  # type: ignore[abstract]

    def test_concrete_subclass_returns_step_key(self):
        ex = _OkExecutor("script")
        assert ex.step_key() == "script"

    async def test_concrete_subclass_execute_returns_dict(self):
        ex = _OkExecutor("script")
        # execute requires Job/JobStep — pass mocks (duck-typed enough for this test)
        class _FakeJob:
            id = "job-1"
        class _FakeStep:
            step_key = "script"
        result = await ex.execute(_FakeJob(), _FakeStep())  # type: ignore
        assert isinstance(result, dict)


# ===========================================================================
# H) StepExecutionError
# ===========================================================================

class TestStepExecutionError:
    def test_attributes(self):
        exc = StepExecutionError("tts", "provider timeout")
        assert exc.step_key == "tts"
        assert exc.reason == "provider timeout"
        assert "tts" in str(exc)
        assert "provider timeout" in str(exc)

    def test_is_job_engine_error(self):
        from app.jobs.exceptions import JobEngineError
        exc = StepExecutionError("script", "fail")
        assert isinstance(exc, JobEngineError)


# ===========================================================================
# I) Gateway — invalid transition raises (integration with service)
# ===========================================================================

class TestGatewayValidation:
    async def test_invalid_transition_raises(self):
        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="completed")
            with pytest.raises(InvalidTransitionError) as exc_info:
                await service.transition_job_status(db, job.id, "running")
            assert exc_info.value.from_status == "completed"
            assert exc_info.value.to_status == "running"


# ===========================================================================
# J) PipelineRunner — happy path
# ===========================================================================

class TestPipelineRunnerHappyPath:
    async def test_job_ends_completed(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "script", step_order=1)
            await _create_step(db, job.id, "metadata", step_order=2)

            executors = {
                "script": _OkExecutor("script"),
                "metadata": _OkExecutor("metadata"),
            }
            runner = PipelineRunner(db=db, executors=executors)
            await runner.run(job.id)

            updated_job = await service.get_job(db, job.id)
            assert updated_job.status == "completed"

    async def test_all_steps_end_completed(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "script", step_order=1)
            await _create_step(db, job.id, "metadata", step_order=2)

            executors = {
                "script": _OkExecutor("script"),
                "metadata": _OkExecutor("metadata"),
            }
            runner = PipelineRunner(db=db, executors=executors)
            await runner.run(job.id)

            steps = await service.get_job_steps(db, job.id)
            for step in steps:
                assert step.status == "completed", f"step {step.step_key} not completed"

    async def test_steps_run_in_order(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        execution_order = []

        class _TrackingExecutor(StepExecutor):
            def __init__(self, name):
                self._name = name
            def step_key(self):
                return self._name
            async def execute(self, job, step):
                execution_order.append(step.step_key)
                return {"step": step.step_key}

        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "tts", step_order=3)
            await _create_step(db, job.id, "script", step_order=1)
            await _create_step(db, job.id, "metadata", step_order=2)

            executors = {
                "script": _TrackingExecutor("script"),
                "metadata": _TrackingExecutor("metadata"),
                "tts": _TrackingExecutor("tts"),
            }
            runner = PipelineRunner(db=db, executors=executors)
            await runner.run(job.id)

            assert execution_order == ["script", "metadata", "tts"]


# ===========================================================================
# K) PipelineRunner — step failure
# ===========================================================================

class TestPipelineRunnerStepFailure:
    async def test_job_ends_failed_on_step_failure(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "script", step_order=1)

            executors = {"script": _FailExecutor("script")}
            runner = PipelineRunner(db=db, executors=executors)
            await runner.run(job.id)

            updated_job = await service.get_job(db, job.id)
            assert updated_job.status == "failed"

    async def test_failing_step_ends_failed(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "script", step_order=1)

            executors = {"script": _FailExecutor("script")}
            runner = PipelineRunner(db=db, executors=executors)
            await runner.run(job.id)

            steps = await service.get_job_steps(db, job.id)
            script_step = next(s for s in steps if s.step_key == "script")
            assert script_step.status == "failed"

    async def test_pipeline_stops_after_failure(self, tmp_path):
        """Second step must not run if first step fails."""
        ws.set_workspace_root(tmp_path)
        ran_steps = []

        class _TrackOk(StepExecutor):
            def __init__(self, name): self._name = name
            def step_key(self): return self._name
            async def execute(self, job, step):
                ran_steps.append(step.step_key)
                return {}

        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "script", step_order=1)
            await _create_step(db, job.id, "metadata", step_order=2)

            executors = {
                "script": _FailExecutor("script"),
                "metadata": _TrackOk("metadata"),
            }
            runner = PipelineRunner(db=db, executors=executors)
            await runner.run(job.id)

            assert "metadata" not in ran_steps


# ===========================================================================
# L) PipelineRunner — no executor registered
# ===========================================================================

class TestPipelineRunnerNoExecutor:
    async def test_missing_executor_fails_step_and_job(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "unknown_step", step_order=1)

            runner = PipelineRunner(db=db, executors={})
            await runner.run(job.id)

            updated_job = await service.get_job(db, job.id)
            assert updated_job.status == "failed"

            steps = await service.get_job_steps(db, job.id)
            step = steps[0]
            assert step.status == "failed"
            assert "No executor" in (step.last_error or "")


# ===========================================================================
# M) PipelineRunner — heartbeat updated
# ===========================================================================

class TestPipelineRunnerHeartbeat:
    async def test_heartbeat_set_after_run(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "script", step_order=1)

            executors = {"script": _OkExecutor("script")}
            runner = PipelineRunner(db=db, executors=executors)
            await runner.run(job.id)

            updated_job = await service.get_job(db, job.id)
            assert updated_job.heartbeat_at is not None


# ===========================================================================
# N) PipelineRunner — provider_trace_json stored
# ===========================================================================

class TestPipelineRunnerProviderTrace:
    async def test_provider_trace_json_stored_on_completion(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        async with AsyncSessionLocal() as db:
            job = await _create_job(db, status="queued")
            await _create_step(db, job.id, "script", step_order=1)

            executors = {"script": _OkExecutor("script")}
            runner = PipelineRunner(db=db, executors=executors)
            await runner.run(job.id)

            steps = await service.get_job_steps(db, job.id)
            script_step = steps[0]
            assert script_step.provider_trace_json is not None
            trace = json.loads(script_step.provider_trace_json)
            assert trace["status"] == "ok"
            assert trace["step"] == "script"


# ===========================================================================
# O) PipelineRunner — job not found
# ===========================================================================

class TestPipelineRunnerJobNotFound:
    async def test_raises_job_not_found_error(self, tmp_path):
        ws.set_workspace_root(tmp_path)
        async with AsyncSessionLocal() as db:
            runner = PipelineRunner(db=db, executors={})
            with pytest.raises(JobNotFoundError):
                await runner.run("nonexistent-job-id")
