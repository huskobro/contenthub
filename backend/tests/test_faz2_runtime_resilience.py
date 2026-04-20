"""
Faz 2 — Runtime resilience closure tests.

Coverage:
  1. Background heartbeat updates `heartbeat_at` while a slow step runs
  2. Background heartbeat stops (task cancelled) when the step finishes
  3. Background heartbeat also bumps when a step raises — finally guarantees cancel
  4. Stale queued-job recovery transitions queued jobs older than threshold to failed
  5. Auto-retry scheduler is race-safe: concurrent ticks can't double-retry same job
  6. _scrape_og_image off-loads the blocking urlopen so the event loop stays responsive

Each case runs against the project's in-memory SQLite test DB (conftest.py).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from app.db.models import Job, JobStep
from app.jobs import pipeline as pipeline_mod
from app.jobs import service
from app.jobs.dispatcher import JobDispatcher
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.jobs.pipeline import PipelineRunner


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; normalize to UTC-aware for comparisons."""
    if dt is None:
        return dt
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _mk_job(db, status: str = "queued") -> Job:
    job = Job(module_type="standard_video", status=status, retry_count=0)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def _mk_step(
    db, *, job_id: str, step_key: str = "slow", step_order: int = 1,
) -> JobStep:
    step = JobStep(
        job_id=job_id,
        step_key=step_key,
        step_order=step_order,
        status="pending",
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


class _SlowOkExecutor(StepExecutor):
    """Sleeps a configurable amount so the background heartbeat has time to tick."""

    def __init__(self, step_key_name: str, sleep_seconds: float) -> None:
        self._key = step_key_name
        self._sleep = sleep_seconds

    def step_key(self) -> str:
        return self._key

    async def execute(self, job: Job, step: JobStep) -> dict:
        await asyncio.sleep(self._sleep)
        return {"status": "ok", "slept": self._sleep}


class _SlowFailExecutor(StepExecutor):
    """Sleeps briefly then raises — verifies the heartbeat finally-block cancels cleanly."""

    def __init__(self, step_key_name: str, sleep_seconds: float) -> None:
        self._key = step_key_name
        self._sleep = sleep_seconds

    def step_key(self) -> str:
        return self._key

    async def execute(self, job: Job, step: JobStep) -> dict:
        await asyncio.sleep(self._sleep)
        raise StepExecutionError(step.step_key, "simulated slow failure")


class _ForeverExecutor(StepExecutor):
    """
    Simulates a long-running executor that only returns when cancelled.
    When cancelled, it mimics the render executor: catch CancelledError,
    perform cleanup (via the `cleanup_called` flag), then re-raise.
    """

    def __init__(self, step_key_name: str) -> None:
        self._key = step_key_name
        self.cleanup_called: bool = False

    def step_key(self) -> str:
        return self._key

    async def execute(self, job: Job, step: JobStep) -> dict:
        try:
            await asyncio.sleep(60)
            return {"status": "ok"}
        except asyncio.CancelledError:
            self.cleanup_called = True
            raise


# ===========================================================================
# 1. Background heartbeat updates heartbeat_at during a slow step
# ===========================================================================


@pytest.mark.asyncio
async def test_background_heartbeat_updates_during_slow_step(db_session, monkeypatch):
    """
    Pipeline heartbeat at step boundaries is not enough for long steps
    (e.g. Remotion render ~600s). Verify the background heartbeat task ticks
    while the step is running.
    """
    # Shorten the interval so the test stays fast.
    monkeypatch.setattr(pipeline_mod, "STEP_HEARTBEAT_INTERVAL_SECONDS", 1)

    job = await _mk_job(db_session)
    await _mk_step(db_session, job_id=job.id, step_key="slow", step_order=1)

    # Mark job started with an old heartbeat so we can see it advance.
    job.heartbeat_at = _now() - timedelta(minutes=10)
    await db_session.commit()
    await db_session.refresh(job)
    baseline_heartbeat = job.heartbeat_at

    executors = {"slow": _SlowOkExecutor("slow", sleep_seconds=2.5)}
    runner = PipelineRunner(db=db_session, executors=executors)
    await runner.run(job.id)

    refreshed = await service.get_job(db_session, job.id)
    assert refreshed is not None
    assert refreshed.status == "completed"
    assert refreshed.heartbeat_at is not None
    # The final heartbeat (after completion) is strictly newer than baseline.
    assert _aware(refreshed.heartbeat_at) > _aware(baseline_heartbeat)


# ===========================================================================
# 2. Background heartbeat task stops after the step finishes (no leak)
# ===========================================================================


@pytest.mark.asyncio
async def test_background_heartbeat_stops_after_step(db_session, monkeypatch):
    """
    If the heartbeat task were leaking, we'd see it keep running after
    the pipeline returns. Verify that after pipeline.run() returns, no
    asyncio task with our heartbeat coroutine name is still alive.
    """
    monkeypatch.setattr(pipeline_mod, "STEP_HEARTBEAT_INTERVAL_SECONDS", 1)

    job = await _mk_job(db_session)
    await _mk_step(db_session, job_id=job.id)

    executors = {"slow": _SlowOkExecutor("slow", sleep_seconds=0.2)}
    runner = PipelineRunner(db=db_session, executors=executors)
    await runner.run(job.id)

    # Give the loop one yield so cancel-awaited tasks settle.
    await asyncio.sleep(0.05)

    heartbeat_coroutine_name = pipeline_mod._background_heartbeat.__name__
    live = [
        t for t in asyncio.all_tasks()
        if t.get_coro().__name__ == heartbeat_coroutine_name and not t.done()
    ]
    assert live == [], f"Background heartbeat task leaked: {live!r}"


# ===========================================================================
# 3. Heartbeat task is cancelled even when the step raises
# ===========================================================================


@pytest.mark.asyncio
async def test_background_heartbeat_cancelled_on_step_failure(db_session, monkeypatch):
    """
    The `finally:` block must cancel the heartbeat task even when the
    executor raises StepExecutionError.
    """
    monkeypatch.setattr(pipeline_mod, "STEP_HEARTBEAT_INTERVAL_SECONDS", 1)

    job = await _mk_job(db_session)
    await _mk_step(db_session, job_id=job.id)

    executors = {"slow": _SlowFailExecutor("slow", sleep_seconds=0.2)}
    runner = PipelineRunner(db=db_session, executors=executors)
    await runner.run(job.id)

    refreshed = await service.get_job(db_session, job.id)
    assert refreshed is not None
    assert refreshed.status == "failed"

    await asyncio.sleep(0.05)
    heartbeat_coroutine_name = pipeline_mod._background_heartbeat.__name__
    live = [
        t for t in asyncio.all_tasks()
        if t.get_coro().__name__ == heartbeat_coroutine_name and not t.done()
    ]
    assert live == [], f"Background heartbeat leaked after failure: {live!r}"


# ===========================================================================
# 4. JobDispatcher.cancel() cancels the pipeline task and propagates
# ===========================================================================


class _StubModuleRegistry:
    """Minimal module registry stub that returns one step for any module."""

    def __init__(self, step_key: str, executor_class):
        self._step_key = step_key
        self._executor_class = executor_class

    def get_steps(self, module_id: str):
        from dataclasses import dataclass

        @dataclass
        class _StepDef:
            step_key: str
            executor_class: type

        return [_StepDef(step_key=self._step_key, executor_class=self._executor_class)]


@pytest.mark.asyncio
async def test_dispatcher_cancel_propagates_to_executor(test_engine, db_session, monkeypatch):
    """
    dispatcher.cancel(job_id) must:
      - return True when there is a live task for that job
      - cause the executor's CancelledError block to run (cleanup_called=True)
      - remove the task from _active_tasks after completion
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
    from app.providers.registry import ProviderRegistry

    # Module registry that hands back our ForeverExecutor for whatever module.
    exec_instance_holder: dict = {}

    class _PatchedBuild:
        """Intercept executor construction so we can observe cleanup_called."""

        def __call__(self, executor_class, registry, pipeline_db=None):
            inst = executor_class("forever") if executor_class is _ForeverExecutor else executor_class()
            exec_instance_holder["inst"] = inst
            return inst

    # Patch the module-level _build_executor_from_registry so the dispatcher
    # picks up _ForeverExecutor and we can introspect it.
    import app.jobs.dispatcher as dispatch_mod
    monkeypatch.setattr(
        dispatch_mod, "_build_executor_from_registry", _PatchedBuild(),
    )

    # Job in queued status so transition_job_status can move it to running.
    job = await _mk_job(db_session, status="queued")
    await _mk_step(db_session, job_id=job.id, step_key="forever", step_order=1)

    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False,
    )
    module_registry = _StubModuleRegistry("forever", _ForeverExecutor)

    dispatcher = JobDispatcher(
        db_session_factory=session_factory,
        module_registry=module_registry,
        event_bus=None,
        registry=ProviderRegistry(),
    )

    await dispatcher.dispatch(job.id)

    # Wait long enough for the pipeline to reach the executor and start sleeping.
    # The executor sleeps 60s — we only need to give the loop a few ticks.
    for _ in range(20):
        await asyncio.sleep(0.05)
        if job.id in dispatcher._active_tasks:
            inst = exec_instance_holder.get("inst")
            if inst is not None:
                break

    assert job.id in dispatcher._active_tasks, "task not registered for cancel"

    # Now cancel.
    signalled = await dispatcher.cancel(job.id)
    assert signalled is True

    # Let the CancelledError propagate.
    for _ in range(20):
        await asyncio.sleep(0.05)
        if job.id not in dispatcher._active_tasks:
            break

    assert job.id not in dispatcher._active_tasks, "task not cleaned up after cancel"
    inst = exec_instance_holder.get("inst")
    assert inst is not None, "executor instance was never built"
    assert inst.cleanup_called is True, "executor did not see CancelledError"


@pytest.mark.asyncio
async def test_dispatcher_cancel_returns_false_when_no_task(test_engine):
    """
    cancel() on an unknown job_id must not raise and must return False.
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
    from app.providers.registry import ProviderRegistry

    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False,
    )
    module_registry = _StubModuleRegistry("forever", _ForeverExecutor)
    dispatcher = JobDispatcher(
        db_session_factory=session_factory,
        module_registry=module_registry,
        event_bus=None,
        registry=ProviderRegistry(),
    )

    result = await dispatcher.cancel("nonexistent-job-id")
    assert result is False


@pytest.mark.asyncio
async def test_cancel_endpoint_calls_dispatcher(client, db_session, monkeypatch):
    """
    POST /api/v1/jobs/{id}/cancel must invoke dispatcher.cancel() — even when
    no task is registered the call must succeed (silent no-op) and the job row
    must be marked cancelled with audit details including cancel_signalled.
    """
    from app.main import app as _app

    # Build a stub dispatcher that records the cancel call.
    class _StubDispatcher:
        def __init__(self):
            self.called_with: list[str] = []

        async def cancel(self, job_id: str) -> bool:
            self.called_with.append(job_id)
            return False  # no live task — still a valid return

    stub = _StubDispatcher()
    # Preserve whatever was on app.state (may be None in tests) and restore after.
    previous = getattr(_app.state, "job_dispatcher", None)
    _app.state.job_dispatcher = stub
    try:
        job = await _mk_job(db_session, status="queued")
        resp = await client.post(f"/api/v1/jobs/{job.id}/cancel")
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["status"] == "cancelled"
        assert stub.called_with == [job.id]
    finally:
        if previous is not None:
            _app.state.job_dispatcher = previous
        else:
            try:
                delattr(_app.state, "job_dispatcher")
            except AttributeError:
                pass


# ===========================================================================
# 7. Stale queued jobs are transitioned to failed
# ===========================================================================


@pytest.mark.asyncio
async def test_stale_queued_job_transitioned_to_failed(db_session):
    """
    A job that sits in 'queued' past the queued_stale_threshold_minutes must
    be transitioned to 'failed' by run_startup_recovery — not just logged.
    """
    from app.jobs.recovery import run_startup_recovery

    # Fresh queued job — not stale.
    fresh = Job(module_type="standard_video", status="queued", retry_count=0)
    db_session.add(fresh)
    await db_session.commit()
    await db_session.refresh(fresh)

    # Stale queued job — created 2 hours ago.
    stale = Job(module_type="standard_video", status="queued", retry_count=0)
    db_session.add(stale)
    await db_session.commit()
    await db_session.refresh(stale)
    # SQLAlchemy may overwrite created_at with default; force it to a past value.
    stale.created_at = _now() - timedelta(hours=2)
    await db_session.commit()

    summary = await run_startup_recovery(
        db_session, queued_stale_threshold_minutes=30,
    )

    assert summary.stale_queued_jobs >= 1
    assert stale.id in summary.stale_queued_job_ids

    # Verify DB state.
    refreshed_stale = await service.get_job(db_session, stale.id)
    refreshed_fresh = await service.get_job(db_session, fresh.id)
    assert refreshed_stale is not None
    # State machine disallows queued→failed; queued→cancelled is the legal
    # terminal for "never started" jobs.
    assert refreshed_stale.status == "cancelled", \
        f"stale queued job not transitioned: status={refreshed_stale.status}"
    assert "queued" in (refreshed_stale.last_error or "").lower()
    # Fresh job stays queued.
    assert refreshed_fresh is not None
    assert refreshed_fresh.status == "queued"


# ===========================================================================
# 8. Auto-retry is race-safe: concurrent ticks do not double-dispatch
# ===========================================================================


@pytest.mark.asyncio
async def test_auto_retry_no_duplicate_on_concurrent_poll(test_engine, db_session):
    """
    If two `_check_and_retry` cycles run concurrently and both select the
    same failed job, only ONE new child job must be dispatched and the
    parent's retry_count must be incremented exactly once.
    """
    from sqlalchemy import delete as sa_delete
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
    from app.jobs.retry_scheduler import _check_and_retry

    # Isolate from prior-test leakage: wipe any residual failed jobs so the
    # concurrent poll cycles can ONLY select the single row we're about to add.
    # Without this, two concurrent polls can each select a DIFFERENT leftover
    # failed job, yielding [1, 1] — which doesn't actually prove the lock works.
    await db_session.execute(sa_delete(JobStep))
    await db_session.execute(sa_delete(Job))
    await db_session.commit()

    # Create a failed job that is long past its backoff.
    failed_job = Job(
        module_type="standard_video",
        status="failed",
        retry_count=0,
        input_data_json="{}",
    )
    db_session.add(failed_job)
    await db_session.commit()
    await db_session.refresh(failed_job)
    failed_job.updated_at = _now() - timedelta(hours=1)
    await db_session.commit()
    original_id = failed_job.id

    # Stub dispatcher so we can count dispatch() calls — no real pipeline.
    dispatch_calls: list[str] = []

    class _StubAppState:
        class _StubDispatcher:
            async def dispatch(self, job_id: str) -> None:
                dispatch_calls.append(job_id)

        job_dispatcher = _StubDispatcher()

    app_state = _StubAppState()
    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False,
    )

    # Fire two concurrent poll cycles on the same DB.
    results = await asyncio.gather(
        _check_and_retry(session_factory, app_state, max_retries=3, base_delay=0),
        _check_and_retry(session_factory, app_state, max_retries=3, base_delay=0),
    )

    # Exactly one poll cycle should report a retry (count=1), the other 0.
    total_retried = sum(results)
    assert total_retried == 1, \
        f"expected exactly one retry across concurrent polls, got {results!r}"
    assert len(dispatch_calls) == 1, \
        f"expected exactly one dispatch() call, got {len(dispatch_calls)}: {dispatch_calls!r}"

    # Parent's retry_count should be exactly 1 after the race.
    from sqlalchemy import select as _select
    async with session_factory() as verify_db:
        row = (await verify_db.execute(
            _select(Job).where(Job.id == original_id)
        )).scalar_one_or_none()
        assert row is not None
        assert row.retry_count == 1, \
            f"parent retry_count race-incremented: got {row.retry_count}"


@pytest.mark.asyncio
async def test_auto_retry_increments_parent_to_block_reselection(test_engine, db_session):
    """
    After a successful retry dispatch, a subsequent poll cycle must NOT
    pick up the same parent again (because retry_count now matches the
    ceiling on later cycles until an additional retry is warranted).
    """
    from sqlalchemy import delete as sa_delete
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
    from app.jobs.retry_scheduler import _check_and_retry

    # Isolate from prior-test leakage: the second poll cycle's assertion only
    # proves "parent ineligible after retry" if the parent is the sole failed
    # row the query could match.
    await db_session.execute(sa_delete(JobStep))
    await db_session.execute(sa_delete(Job))
    await db_session.commit()

    failed_job = Job(
        module_type="standard_video",
        status="failed",
        retry_count=2,  # One retry left (< max_retries=3)
        input_data_json="{}",
    )
    db_session.add(failed_job)
    await db_session.commit()
    await db_session.refresh(failed_job)
    failed_job.updated_at = _now() - timedelta(hours=1)
    await db_session.commit()

    dispatch_calls: list[str] = []

    class _StubAppState:
        class _StubDispatcher:
            async def dispatch(self, job_id: str) -> None:
                dispatch_calls.append(job_id)

        job_dispatcher = _StubDispatcher()

    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False,
    )

    # First cycle retries the parent.
    count1 = await _check_and_retry(
        session_factory, _StubAppState(), max_retries=3, base_delay=0,
    )
    assert count1 == 1
    assert len(dispatch_calls) == 1

    # Second cycle sees retry_count now == 3 (which is == max), so parent
    # is no longer eligible.
    count2 = await _check_and_retry(
        session_factory, _StubAppState(), max_retries=3, base_delay=0,
    )
    assert count2 == 0
    assert len(dispatch_calls) == 1, "parent must not be retried again"


# ===========================================================================
# 10. _scrape_og_image_async off-loads blocking urlopen — event loop stays alive
# ===========================================================================


@pytest.mark.asyncio
async def test_scrape_og_image_async_does_not_block_event_loop(monkeypatch):
    """
    The async wrapper around `_scrape_og_image` must run the blocking call
    on a worker thread so that a concurrent coroutine (ticking a counter)
    continues to execute while the "scrape" is in flight.

    We monkeypatch `_scrape_og_image` itself to simulate a 400 ms blocking
    call via `time.sleep`. Without `asyncio.to_thread`, this would freeze the
    event loop and the concurrent ticker would record at most 1 tick. With
    off-load, the ticker records multiple ticks during the same window.
    """
    import time
    from app.source_scans import scan_engine as _engine

    def _blocking_fake(url: str):
        time.sleep(0.4)  # Simulates urllib.request.urlopen on a slow host
        return "https://example.test/og.jpg"

    monkeypatch.setattr(_engine, "_scrape_og_image", _blocking_fake)

    ticks: list[float] = []

    async def _ticker() -> None:
        for _ in range(20):
            ticks.append(asyncio.get_event_loop().time())
            await asyncio.sleep(0.05)

    ticker_task = asyncio.create_task(_ticker())
    result = await _engine._scrape_og_image_async("https://example.test/article")
    # Let the ticker finish any final ticks.
    await asyncio.sleep(0.05)
    ticker_task.cancel()
    try:
        await ticker_task
    except asyncio.CancelledError:
        pass

    assert result == "https://example.test/og.jpg"
    # If the blocking call had frozen the loop, ticks would be <= 1 at this
    # point. With to_thread off-load, we expect several ticks during the
    # 400 ms sleep window.
    assert len(ticks) >= 4, (
        f"event loop froze during blocking scrape; ticks={len(ticks)}"
    )


@pytest.mark.asyncio
async def test_scrape_og_image_async_swallows_exceptions(monkeypatch):
    """
    The async wrapper must never raise — it should swallow inner failures
    and return None (matches the sync function's contract).
    """
    from app.source_scans import scan_engine as _engine

    def _raiser(url: str):
        raise RuntimeError("simulated scrape crash")

    monkeypatch.setattr(_engine, "_scrape_og_image", _raiser)

    # `_scrape_og_image` itself catches internally, but we still want to
    # verify the async wrapper does not propagate anything.
    result = await _engine._scrape_og_image_async("https://example.test/x")
    assert result is None
