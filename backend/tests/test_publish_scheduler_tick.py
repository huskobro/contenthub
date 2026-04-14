"""
Gate 3A — Scheduler tick smoke test (publish layer hardening).

Proves the polling loop's single-tick logic end-to-end without real HTTP
or OAuth: a PublishRecord whose `scheduled_at` is in the past must be
transitioned `scheduled → publishing` by one call to `_check_and_trigger`.

Scope:
  * Logic only — no real YouTube upload, no real adapter wired.
  * In-memory SQLite — zero residue, no FS side effects.
  * Runs in CI without credentials.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from app.db.models import Base, Job, PublishRecord, PublishLog
from app.publish.enums import PublishStatus
from app.publish.scheduler import _check_and_trigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


@pytest.fixture
async def engine_and_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield engine, factory
    await engine.dispose()


async def _insert_due_scheduled_record(
    factory, *, scheduled_at: datetime, record_id: str = "pub-smoke-3a",
) -> PublishRecord:
    async with factory() as db:
        # PublishRecord.job_id is NOT NULL — seed a minimal Job row first.
        job_id = f"job-{record_id}"
        job = Job(
            id=job_id,
            module_type="standard_video",
            status="completed",
            retry_count=0,
            auto_advanced=False,
            is_test_data=True,
        )
        db.add(job)
        await db.flush()

        rec = PublishRecord(
            id=record_id,
            job_id=job_id,
            content_ref_type="standard_video",
            content_ref_id=job_id,
            platform="youtube",
            status=PublishStatus.SCHEDULED.value,
            review_state="approved",
            scheduled_at=scheduled_at,
            publish_attempt_count=0,
        )
        db.add(rec)
        await db.commit()
        await db.refresh(rec)
        return rec


@pytest.mark.asyncio
async def test_scheduler_tick_transitions_due_record_to_publishing(engine_and_factory):
    """Happy path: a record whose scheduled_at is 1s ago must be triggered."""
    _, factory = engine_and_factory

    past = datetime.now(timezone.utc) - timedelta(seconds=1)
    await _insert_due_scheduled_record(factory, scheduled_at=past)

    triggered, due, skipped = await _check_and_trigger(factory)
    assert triggered == 1, f"expected 1 record triggered, got {triggered}"
    assert due == 1
    assert skipped == 0

    async with factory() as db:
        rec = (await db.execute(
            select(PublishRecord).where(PublishRecord.id == "pub-smoke-3a")
        )).scalar_one()
        assert rec.status == PublishStatus.PUBLISHING.value, (
            f"scheduled→publishing transition failed; got {rec.status}"
        )
        # publish_attempt was logged
        logs = (await db.execute(
            select(PublishLog).where(PublishLog.publish_record_id == "pub-smoke-3a")
        )).scalars().all()
        assert any(
            log.event_type == "publish_attempt" for log in logs
        ), f"expected publish_attempt log, got events: {[l.event_type for l in logs]}"


@pytest.mark.asyncio
async def test_scheduler_tick_skips_future_scheduled(engine_and_factory):
    """Future record must NOT be triggered (clock guard)."""
    _, factory = engine_and_factory

    future = datetime.now(timezone.utc) + timedelta(minutes=10)
    await _insert_due_scheduled_record(
        factory, scheduled_at=future, record_id="pub-smoke-future",
    )

    triggered, due, skipped = await _check_and_trigger(factory)
    assert triggered == 0, "future-scheduled record must not be triggered"
    assert due == 0
    assert skipped == 0

    async with factory() as db:
        rec = (await db.execute(
            select(PublishRecord).where(PublishRecord.id == "pub-smoke-future")
        )).scalar_one()
        assert rec.status == PublishStatus.SCHEDULED.value, (
            "status must remain scheduled when not due"
        )


@pytest.mark.asyncio
async def test_scheduler_tick_empty_db_returns_zero(engine_and_factory):
    """No scheduled records → 0 triggered, no exception."""
    _, factory = engine_and_factory
    triggered, due, skipped = await _check_and_trigger(factory)
    assert triggered == 0
    assert due == 0
    assert skipped == 0


@pytest.mark.asyncio
async def test_scheduler_tick_ignores_non_scheduled_status(engine_and_factory):
    """Records in publishing/published/draft must be ignored even if
    scheduled_at is past (defensive — status is the source of truth)."""
    _, factory = engine_and_factory

    past = datetime.now(timezone.utc) - timedelta(hours=1)
    async with factory() as db:
        # Seed one Job row to satisfy PublishRecord.job_id NOT NULL.
        db.add(Job(
            id="job-wrong-status",
            module_type="standard_video",
            status="completed",
            retry_count=0,
            auto_advanced=False,
            is_test_data=True,
        ))
        await db.flush()
        for i, status_val in enumerate([
            PublishStatus.PUBLISHING.value,
            PublishStatus.PUBLISHED.value,
            PublishStatus.DRAFT.value,
        ]):
            db.add(PublishRecord(
                id=f"pub-wrong-status-{i}",
                job_id="job-wrong-status",
                content_ref_type="standard_video",
                content_ref_id="job-wrong-status",
                platform="youtube",
                status=status_val,
                scheduled_at=past,
                publish_attempt_count=0,
            ))
        await db.commit()

    triggered, due, skipped = await _check_and_trigger(factory)
    assert triggered == 0, (
        f"records with status!=scheduled must be ignored, but {triggered} "
        "were triggered — scheduler is leaking into non-scheduled states"
    )
    assert due == 0
    assert skipped == 0


@pytest.mark.asyncio
async def test_scheduler_tick_continues_on_individual_failure(
    engine_and_factory, monkeypatch,
):
    """If one record's trigger fails, the loop must keep going for the rest.
    The scheduler's contract says 'never raise — loop continues'."""
    _, factory = engine_and_factory

    past = datetime.now(timezone.utc) - timedelta(seconds=1)
    await _insert_due_scheduled_record(
        factory, scheduled_at=past, record_id="pub-will-fail",
    )
    await _insert_due_scheduled_record(
        factory, scheduled_at=past, record_id="pub-will-succeed",
    )

    # Patch trigger_publish to fail for the first record only.
    from app.publish import service as svc

    real_trigger = svc.trigger_publish
    call_order: list[str] = []

    async def _flaky(session, record_id, actor_id=None, note=None):
        call_order.append(record_id)
        if record_id == "pub-will-fail":
            raise RuntimeError("simulated trigger failure")
        return await real_trigger(session, record_id, actor_id=actor_id, note=note)

    monkeypatch.setattr(svc, "trigger_publish", _flaky)

    triggered, due, skipped = await _check_and_trigger(factory)
    # Only the second record succeeded.
    assert triggered == 1
    assert due == 2
    assert skipped == 0
    # Both were attempted — per-record isolation.
    assert set(call_order) == {"pub-will-fail", "pub-will-succeed"}
