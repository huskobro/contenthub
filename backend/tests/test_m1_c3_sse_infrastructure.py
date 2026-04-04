"""
Tests — Phase M1-C3: SSE Infrastructure

Covers:
  A) EventBus.publish broadcasts to all active subscribers
  B) EventBus.subscribe yields SSE-formatted strings
  C) SSE format: event line + data line + double newline
  D) EventBus.unsubscribe removes subscriber and stops generator
  E) Per-subscriber queues: one subscriber does not affect another
  F) publish_job_update payload format
  G) publish_step_update payload format
  H) subscriber_count reflects active subscribers
  I) publish with no subscribers does not raise
  J) PipelineRunner publishes job events when event_bus provided
  K) PipelineRunner publishes step events when event_bus provided
  L) PipelineRunner works without event_bus (no crash)
  M) PipelineRunner job failure publishes failed event
"""

import asyncio
import json
import pytest
from unittest.mock import MagicMock, patch

from app.sse.bus import EventBus, _format_sse
from app.db.session import AsyncSessionLocal
from app.db.models import Job, JobStep
from app.jobs import service
from app.jobs.pipeline import PipelineRunner
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_sse(raw: str) -> tuple[str, dict]:
    """Parse a raw SSE string into (event_type, payload_dict)."""
    lines = raw.strip().split("\n")
    event_type = None
    data = None
    for line in lines:
        if line.startswith("event: "):
            event_type = line[len("event: "):]
        elif line.startswith("data: "):
            data = json.loads(line[len("data: "):])
    return event_type, data


async def _create_job_direct(db, status="queued") -> Job:
    job = Job(
        module_type="standard_video",
        owner_id=None,
        template_id=None,
        source_context_json="{}",
        workspace_path="/tmp/test",
        status=status,
        retry_count=0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def _create_step_direct(db, job_id: str, step_key: str, step_order: int) -> JobStep:
    step = JobStep(
        job_id=job_id,
        step_key=step_key,
        step_order=step_order,
        status="pending",
        idempotency_type="re_executable",
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


# ---------------------------------------------------------------------------
# A) publish broadcasts to all subscribers
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_publish_delivers_to_all_subscribers():
    bus = EventBus()
    received_a = []
    received_b = []

    async def collect_a():
        async for msg in bus.subscribe("client-a"):
            received_a.append(msg)
            break  # only collect one

    async def collect_b():
        async for msg in bus.subscribe("client-b"):
            received_b.append(msg)
            break

    task_a = asyncio.create_task(collect_a())
    task_b = asyncio.create_task(collect_b())
    await asyncio.sleep(0)  # let generators register

    bus.publish("test_event", {"key": "value"})
    await asyncio.gather(task_a, task_b)

    assert len(received_a) == 1
    assert len(received_b) == 1


# ---------------------------------------------------------------------------
# B) subscribe yields SSE-formatted strings
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_subscribe_yields_sse_formatted_string():
    bus = EventBus()
    received = []

    async def collect():
        async for msg in bus.subscribe("client-x"):
            received.append(msg)
            break

    task = asyncio.create_task(collect())
    await asyncio.sleep(0)

    bus.publish("job:status_changed", {"job_id": "j1", "status": "running"})
    await task

    assert len(received) == 1
    assert "event: job:status_changed" in received[0]
    assert "data: " in received[0]


# ---------------------------------------------------------------------------
# C) SSE format: event + data + double newline
# ---------------------------------------------------------------------------

def test_format_sse_structure():
    raw = _format_sse("job:step_changed", {"job_id": "j1", "step_key": "script"})
    assert raw.startswith("event: job:step_changed\n")
    assert "data: " in raw
    assert raw.endswith("\n\n")
    # data line is valid JSON
    data_line = [l for l in raw.split("\n") if l.startswith("data: ")][0]
    payload = json.loads(data_line[len("data: "):])
    assert payload["job_id"] == "j1"
    assert payload["step_key"] == "script"


# ---------------------------------------------------------------------------
# D) unsubscribe stops the generator
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unsubscribe_stops_generator():
    bus = EventBus()
    messages = []

    async def collect():
        async for msg in bus.subscribe("client-unsub"):
            messages.append(msg)

    task = asyncio.create_task(collect())
    await asyncio.sleep(0)

    bus.unsubscribe("client-unsub")
    await asyncio.wait_for(task, timeout=1.0)

    # Generator received sentinel, stopped cleanly — no messages
    assert messages == []


# ---------------------------------------------------------------------------
# E) Per-subscriber queues are independent
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_per_subscriber_queues_are_independent():
    bus = EventBus()
    received_a = []

    async def collect_a():
        async for msg in bus.subscribe("client-ind-a"):
            received_a.append(msg)
            break

    task_a = asyncio.create_task(collect_a())
    await asyncio.sleep(0)

    # Subscribe b but never collect — b's queue fills independently
    async def idle_b():
        async for _ in bus.subscribe("client-ind-b"):
            break

    task_b = asyncio.create_task(idle_b())
    await asyncio.sleep(0)

    bus.publish("test_event", {"x": 1})
    # Unsubscribe b cleanly
    bus.unsubscribe("client-ind-b")

    await task_a
    await asyncio.wait_for(task_b, timeout=1.0)

    # a received its message regardless of b's state
    assert len(received_a) == 1


# ---------------------------------------------------------------------------
# F) publish_job_update payload format
# ---------------------------------------------------------------------------

def test_publish_job_update_format():
    bus = EventBus()
    captured = []

    original_publish = bus.publish

    def spy_publish(event_type, payload):
        captured.append((event_type, payload))
        original_publish(event_type, payload)

    bus.publish = spy_publish
    bus.publish_job_update("job-123", "running", "script")

    assert len(captured) == 1
    event_type, payload = captured[0]
    assert event_type == "job:status_changed"
    assert payload["job_id"] == "job-123"
    assert payload["status"] == "running"
    assert payload["step_key"] == "script"
    assert "emitted_at" in payload


# ---------------------------------------------------------------------------
# G) publish_step_update payload format
# ---------------------------------------------------------------------------

def test_publish_step_update_format():
    bus = EventBus()
    captured = []

    original_publish = bus.publish

    def spy_publish(event_type, payload):
        captured.append((event_type, payload))
        original_publish(event_type, payload)

    bus.publish = spy_publish
    bus.publish_step_update("job-456", "script", "completed")

    assert len(captured) == 1
    event_type, payload = captured[0]
    assert event_type == "job:step_changed"
    assert payload["job_id"] == "job-456"
    assert payload["step_key"] == "script"
    assert payload["status"] == "completed"
    assert "emitted_at" in payload


# ---------------------------------------------------------------------------
# H) subscriber_count reflects active subscribers
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_subscriber_count():
    bus = EventBus()
    assert bus.subscriber_count() == 0

    async def hold(cid):
        async for _ in bus.subscribe(cid):
            break  # exits on sentinel

    t1 = asyncio.create_task(hold("c1"))
    t2 = asyncio.create_task(hold("c2"))
    await asyncio.sleep(0)

    assert bus.subscriber_count() == 2

    bus.unsubscribe("c1")
    bus.unsubscribe("c2")
    await asyncio.gather(t1, t2)

    assert bus.subscriber_count() == 0


# ---------------------------------------------------------------------------
# I) publish with no subscribers does not raise
# ---------------------------------------------------------------------------

def test_publish_no_subscribers():
    bus = EventBus()
    # Should not raise
    bus.publish("job:status_changed", {"job_id": "j1", "status": "running"})
    bus.publish_job_update("j1", "completed", None)
    bus.publish_step_update("j1", "script", "completed")


# ---------------------------------------------------------------------------
# J & K) PipelineRunner publishes job and step events when event_bus provided
# ---------------------------------------------------------------------------

class _SuccessExecutor(StepExecutor):
    def step_key(self) -> str:
        return "script"

    async def execute(self, job: Job, step: JobStep) -> dict:
        return {"result": "ok"}


@pytest.mark.asyncio
async def test_pipeline_publishes_events_with_bus():
    bus = EventBus()
    published = []

    original_publish = bus.publish

    def spy_publish(event_type, payload):
        published.append((event_type, payload))
        original_publish(event_type, payload)

    bus.publish = spy_publish

    async with AsyncSessionLocal() as db:
        job = await _create_job_direct(db, status="queued")
        await _create_step_direct(db, job.id, "script", 1)

        runner = PipelineRunner(
            db=db,
            executors={"script": _SuccessExecutor()},
            event_bus=bus,
        )
        await runner.run(job.id)

    event_types = [e for e, _ in published]
    # job:status_changed for running, step:running, step:completed, job:completed
    assert "job:status_changed" in event_types
    assert "job:step_changed" in event_types

    job_events = [(e, p) for e, p in published if e == "job:status_changed"]
    statuses = [p["status"] for _, p in job_events]
    assert "running" in statuses
    assert "completed" in statuses

    step_events = [(e, p) for e, p in published if e == "job:step_changed"]
    step_statuses = [p["status"] for _, p in step_events]
    assert "running" in step_statuses
    assert "completed" in step_statuses


# ---------------------------------------------------------------------------
# L) PipelineRunner works without event_bus (no crash)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pipeline_works_without_event_bus():
    async with AsyncSessionLocal() as db:
        job = await _create_job_direct(db, status="queued")
        await _create_step_direct(db, job.id, "script", 1)

        runner = PipelineRunner(
            db=db,
            executors={"script": _SuccessExecutor()},
            event_bus=None,
        )
        # Should not raise
        await runner.run(job.id)

        updated = await service.get_job(db, job.id)
        assert updated.status == "completed"


# ---------------------------------------------------------------------------
# M) PipelineRunner job failure publishes failed event
# ---------------------------------------------------------------------------

class _FailingExecutor(StepExecutor):
    def step_key(self) -> str:
        return "script"

    async def execute(self, job: Job, step: JobStep) -> dict:
        raise StepExecutionError("intentional failure")


@pytest.mark.asyncio
async def test_pipeline_publishes_failed_event_on_step_failure():
    bus = EventBus()
    published = []

    original_publish = bus.publish

    def spy_publish(event_type, payload):
        published.append((event_type, payload))
        original_publish(event_type, payload)

    bus.publish = spy_publish

    async with AsyncSessionLocal() as db:
        job = await _create_job_direct(db, status="queued")
        await _create_step_direct(db, job.id, "script", 1)

        runner = PipelineRunner(
            db=db,
            executors={"script": _FailingExecutor()},
            event_bus=bus,
        )
        await runner.run(job.id)

    job_events = [(e, p) for e, p in published if e == "job:status_changed"]
    statuses = [p["status"] for _, p in job_events]
    assert "failed" in statuses

    step_events = [(e, p) for e, p in published if e == "job:step_changed"]
    step_statuses = [p["status"] for _, p in step_events]
    assert "failed" in step_statuses
