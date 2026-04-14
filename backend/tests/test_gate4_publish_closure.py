"""
Gate 4 (Publish Closure) — kapsamlı backend test paketi.

Kapsanan altyapı:
  Z-1: bulk_service (approve/reject/cancel/retry)
  Z-3: scheduler health snapshot (healthy/stale/unknown)
  Z-4: token_preflight + scheduler skip (non-aggressive rule)
  Z-5: error_classifier + last_error_category persistence

Tüm testler in-memory SQLite + autouse override_engine fixture'ı kullanır.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.models import (
    Base,
    Job,
    PlatformConnection,
    PlatformCredential,
    PublishLog,
    PublishRecord,
)
from app.publish import bulk_service, service
from app.publish.enums import (
    PublishErrorCategory,
    PublishLogEvent,
    PublishStatus,
)
from app.publish.error_classifier import (
    categorize_publish_error,
    suggested_action,
)
from app.publish.scheduler import (
    SCHEDULER_STALE_THRESHOLD_SECONDS,
    _check_and_trigger,
    _empty_status,
    _record_tick,
    snapshot_scheduler_status,
)
from app.publish.token_preflight import (
    DEFAULT_CRITICAL_THRESHOLD,
    DEFAULT_WARN_THRESHOLD,
    assert_publish_token_ready,
    classify_token_expiry,
    get_connection_token_status,
    suggested_action_for_severity,
)


# ---------------------------------------------------------------------------
# Fixture — bağımsız in-memory engine + factory (gate3a stiliyle uyumlu)
# ---------------------------------------------------------------------------

@pytest.fixture
async def engine_and_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield engine, factory
    await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_job(db: AsyncSession, job_id: str) -> Job:
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
    return job


async def _seed_record(
    factory,
    *,
    record_id: str,
    status: str,
    review_state: str = "pending",
    scheduled_at: datetime | None = None,
    platform_connection_id: str | None = None,
    last_error: str | None = None,
) -> str:
    async with factory() as db:
        await _seed_job(db, f"job-{record_id}")
        rec = PublishRecord(
            id=record_id,
            job_id=f"job-{record_id}",
            content_ref_type="standard_video",
            content_ref_id=f"job-{record_id}",
            platform="youtube",
            status=status,
            review_state=review_state,
            scheduled_at=scheduled_at,
            platform_connection_id=platform_connection_id,
            last_error=last_error,
            publish_attempt_count=0,
        )
        db.add(rec)
        await db.commit()
    return record_id


async def _seed_connection(
    factory,
    *,
    connection_id: str,
    requires_reauth: bool = False,
    expires_at: datetime | None = None,
    refresh_token: str | None = "rt-test",
) -> str:
    """
    Seed a PlatformConnection with optional credential.

    The fixture engine here is bare SQLite (no PRAGMA foreign_keys=ON in
    create_async_engine call), so FK to channel_profiles is not enforced —
    we can skip seeding ChannelProfile for these unit-scope tests.
    """
    async with factory() as db:
        conn = PlatformConnection(
            id=connection_id,
            channel_profile_id=f"cp-{connection_id}",  # not enforced in test
            platform="youtube",
            auth_state="connected",
            token_state="valid",
            scope_status="sufficient",
            connection_status="connected",
            requires_reauth=requires_reauth,
        )
        db.add(conn)
        if expires_at is not None or refresh_token is not None:
            cred = PlatformCredential(
                id=f"cred-{connection_id}",
                platform_connection_id=connection_id,
                access_token="at-test",
                refresh_token=refresh_token,
                token_expiry=expires_at,
            )
            db.add(cred)
        await db.commit()
    return connection_id


# ===========================================================================
# Z-5 — error_classifier
# ===========================================================================

class TestErrorClassifier:
    def test_token_error_message(self):
        cat = categorize_publish_error("invalid_grant: token expired")
        assert cat == PublishErrorCategory.TOKEN_ERROR

    def test_quota_message(self):
        cat = categorize_publish_error("quotaExceeded: daily limit", status_code=429)
        assert cat == PublishErrorCategory.QUOTA_EXCEEDED

    def test_quota_status_code_only(self):
        cat = categorize_publish_error("Some message", status_code=429)
        assert cat == PublishErrorCategory.QUOTA_EXCEEDED

    def test_network_message(self):
        cat = categorize_publish_error("Connection timeout while uploading")
        assert cat == PublishErrorCategory.NETWORK

    def test_validation_message(self):
        cat = categorize_publish_error("invalid title: too long")
        assert cat == PublishErrorCategory.VALIDATION

    def test_permission_message(self):
        cat = categorize_publish_error("forbidden: scope insufficient")
        assert cat == PublishErrorCategory.PERMISSION

    def test_asset_missing(self):
        cat = categorize_publish_error("File not found: final.mp4")
        assert cat == PublishErrorCategory.ASSET_MISSING

    def test_unknown_default(self):
        cat = categorize_publish_error("totally weird thing happened")
        assert cat == PublishErrorCategory.UNKNOWN

    def test_token_priority_over_permission(self):
        """token_error baskın olmalı (sıraya bağlı)."""
        cat = categorize_publish_error("invalid_grant forbidden")
        assert cat == PublishErrorCategory.TOKEN_ERROR

    def test_never_raises_on_empty(self):
        cat = categorize_publish_error("")
        assert cat == PublishErrorCategory.UNKNOWN

    def test_never_raises_on_none(self):
        cat = categorize_publish_error(None)  # type: ignore[arg-type]
        assert cat == PublishErrorCategory.UNKNOWN

    def test_suggested_action_returns_string(self):
        for cat in PublishErrorCategory:
            text = suggested_action(cat)
            assert isinstance(text, str) and text.strip(), cat


# ===========================================================================
# Z-5 — last_error_category persistence
# ===========================================================================

@pytest.mark.asyncio
async def test_mark_failed_writes_error_category(engine_and_factory):
    """mark_failed kayda last_error_category yazmalı."""
    _, factory = engine_and_factory
    rid = await _seed_record(
        factory, record_id="pub-fail-1", status=PublishStatus.PUBLISHING.value,
    )
    async with factory() as db:
        await service.mark_failed(
            db, rid,
            error_message="invalid_grant: refresh required",
            actor_id="test",
        )
    async with factory() as db:
        rec = (await db.execute(
            select(PublishRecord).where(PublishRecord.id == rid)
        )).scalar_one()
        assert rec.status == PublishStatus.FAILED.value
        assert rec.last_error_category == PublishErrorCategory.TOKEN_ERROR.value


@pytest.mark.asyncio
async def test_published_clears_error_category(engine_and_factory):
    """Successful publish should clear stale last_error_category."""
    _, factory = engine_and_factory
    rid = await _seed_record(
        factory, record_id="pub-recover",
        status=PublishStatus.PUBLISHING.value,
        last_error="quotaExceeded",
    )
    # Pre-set stale category
    async with factory() as db:
        rec = (await db.execute(
            select(PublishRecord).where(PublishRecord.id == rid)
        )).scalar_one()
        rec.last_error_category = PublishErrorCategory.QUOTA_EXCEEDED.value
        await db.commit()

    async with factory() as db:
        await service.mark_published(
            db, rid,
            platform_video_id="vid-1",
            platform_url="https://x/v/1",
            actor_id="test",
        )
    async with factory() as db:
        rec = (await db.execute(
            select(PublishRecord).where(PublishRecord.id == rid)
        )).scalar_one()
        assert rec.status == PublishStatus.PUBLISHED.value
        assert rec.last_error_category is None


# ===========================================================================
# Z-3 — Scheduler health snapshot
# ===========================================================================

class TestSchedulerHealth:
    def test_unknown_when_raw_is_none(self):
        snap = snapshot_scheduler_status(None)
        assert snap["state"] == "unknown"
        assert snap["last_tick_at"] is None
        assert snap["total_ticks"] == 0

    def test_unknown_when_no_tick(self):
        raw = _empty_status(60)
        snap = snapshot_scheduler_status(raw)
        # started_at populated but last_tick_at None → unknown
        assert snap["state"] == "unknown"
        assert snap["interval_seconds"] == 60.0

    def test_healthy_after_recent_tick(self):
        raw = _empty_status(60)
        _record_tick(raw, due_count=2, triggered=2)
        snap = snapshot_scheduler_status(raw)
        assert snap["state"] == "healthy"
        assert snap["last_due_count"] == 2
        assert snap["last_triggered_count"] == 2
        assert snap["total_ticks"] == 1
        assert snap["total_triggered"] == 2

    def test_stale_when_last_tick_old(self):
        raw = _empty_status(60)
        _record_tick(raw, due_count=0, triggered=0)
        # Force last_tick_at to be older than threshold
        raw["last_tick_at"] = datetime.now(timezone.utc) - timedelta(seconds=999)
        snap = snapshot_scheduler_status(
            raw, stale_threshold_seconds=180,
        )
        assert snap["state"] == "stale"

    def test_record_tick_skipped_count_propagates(self):
        raw = _empty_status(60)
        _record_tick(raw, due_count=3, triggered=1, skipped=2)
        snap = snapshot_scheduler_status(raw)
        assert snap["last_skipped_count"] == 2
        assert snap["total_skipped"] == 2

    def test_record_tick_error_increments_consecutive(self):
        raw = _empty_status(60)
        _record_tick(raw, due_count=0, triggered=0, error="boom")
        _record_tick(raw, due_count=0, triggered=0, error="boom")
        snap = snapshot_scheduler_status(raw)
        assert snap["consecutive_errors"] == 2
        assert snap["last_error"] == "boom"

    def test_successful_tick_resets_error_counter(self):
        raw = _empty_status(60)
        _record_tick(raw, due_count=0, triggered=0, error="boom")
        _record_tick(raw, due_count=0, triggered=0)
        snap = snapshot_scheduler_status(raw)
        assert snap["consecutive_errors"] == 0
        assert snap["last_error"] is None


# ===========================================================================
# Z-4 — token_preflight pure classifier
# ===========================================================================

class TestTokenClassifier:
    def test_unknown_when_no_expiry(self):
        st = classify_token_expiry(
            None, requires_reauth=False, has_refresh_token=False,
        )
        assert st.severity == "unknown"
        assert st.is_blocking is False

    def test_reauth_when_flag_set(self):
        st = classify_token_expiry(
            None, requires_reauth=True, has_refresh_token=True,
        )
        assert st.severity == "reauth"
        assert st.is_blocking is True  # ONLY case that blocks

    def test_expired_with_refresh_is_not_blocking(self):
        """Self-healing rule: refresh_token presence ⇒ expired is non-blocking."""
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        st = classify_token_expiry(
            past, requires_reauth=False, has_refresh_token=True,
        )
        assert st.severity == "expired"
        assert st.is_blocking is False, (
            "Expired token with refresh_token must NOT block — pre-flight is "
            "non-aggressive per Gate 4 Z-4 mandate."
        )

    def test_expired_without_refresh_still_not_blocking(self):
        """Even without refresh token, expired alone does not block — only
        requires_reauth=True triggers blocking. The connection layer is
        responsible for setting requires_reauth when refresh fails."""
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        st = classify_token_expiry(
            past, requires_reauth=False, has_refresh_token=False,
        )
        assert st.severity == "expired"
        assert st.is_blocking is False

    def test_critical_severity(self):
        soon = datetime.now(timezone.utc) + timedelta(hours=2)
        st = classify_token_expiry(
            soon, requires_reauth=False, has_refresh_token=True,
        )
        assert st.severity == "critical"
        assert st.is_blocking is False

    def test_warn_severity(self):
        in_three_days = datetime.now(timezone.utc) + timedelta(days=3)
        st = classify_token_expiry(
            in_three_days, requires_reauth=False, has_refresh_token=True,
        )
        assert st.severity == "warn"

    def test_ok_severity(self):
        far = datetime.now(timezone.utc) + timedelta(days=30)
        st = classify_token_expiry(
            far, requires_reauth=False, has_refresh_token=True,
        )
        assert st.severity == "ok"
        assert st.is_blocking is False

    def test_naive_datetime_normalized(self):
        """Naive datetimes (SQLite default) must be treated as UTC."""
        naive_past = (datetime.now(timezone.utc) - timedelta(hours=1)).replace(
            tzinfo=None,
        )
        st = classify_token_expiry(
            naive_past, requires_reauth=False, has_refresh_token=True,
        )
        assert st.severity == "expired"

    def test_thresholds_constants_match_doc(self):
        assert DEFAULT_WARN_THRESHOLD == timedelta(days=7)
        assert DEFAULT_CRITICAL_THRESHOLD == timedelta(hours=24)

    def test_suggested_action_for_each_severity(self):
        for sev in ("ok", "warn", "critical", "expired", "reauth", "unknown"):
            assert isinstance(suggested_action_for_severity(sev), str)
            assert suggested_action_for_severity(sev).strip()


# ===========================================================================
# Z-4 — token_preflight DB integration
# ===========================================================================

@pytest.mark.asyncio
async def test_get_connection_token_status_unknown_when_missing(engine_and_factory):
    _, factory = engine_and_factory
    async with factory() as db:
        st = await get_connection_token_status(db, "no-such-conn")
        assert st.severity == "unknown"


@pytest.mark.asyncio
async def test_get_connection_token_status_reauth_blocks(engine_and_factory):
    _, factory = engine_and_factory
    cid = await _seed_connection(
        factory, connection_id="conn-reauth", requires_reauth=True,
    )
    async with factory() as db:
        st = await get_connection_token_status(db, cid)
        assert st.severity == "reauth"
        assert st.is_blocking is True


@pytest.mark.asyncio
async def test_assert_publish_token_ready_no_id(engine_and_factory):
    """Geçerli bir connection_id yoksa unknown döner — bloklamaz."""
    _, factory = engine_and_factory
    async with factory() as db:
        st = await assert_publish_token_ready(db, None)
        assert st.severity == "unknown"
        assert st.is_blocking is False


# ===========================================================================
# Z-3 / Z-4 — scheduler tick + pre-flight integration
# ===========================================================================

@pytest.mark.asyncio
async def test_scheduler_skips_record_when_connection_requires_reauth(engine_and_factory):
    """Reauth gerektiren bağlantıdaki due record SCHEDULED kalmalı,
    skipped sayacı 1 dönmeli."""
    _, factory = engine_and_factory

    cid = await _seed_connection(
        factory, connection_id="conn-blocked", requires_reauth=True,
    )
    rid = await _seed_record(
        factory,
        record_id="pub-blocked-by-reauth",
        status=PublishStatus.SCHEDULED.value,
        scheduled_at=datetime.now(timezone.utc) - timedelta(seconds=1),
        platform_connection_id=cid,
    )

    triggered, due, skipped = await _check_and_trigger(factory)
    assert triggered == 0
    assert due == 1
    assert skipped == 1

    async with factory() as db:
        rec = (await db.execute(
            select(PublishRecord).where(PublishRecord.id == rid)
        )).scalar_one()
        assert rec.status == PublishStatus.SCHEDULED.value, (
            "Record must remain scheduled when blocked by token pre-flight"
        )


@pytest.mark.asyncio
async def test_scheduler_proceeds_when_token_expired_with_refresh(engine_and_factory):
    """Self-healing: süresi geçmiş ama refresh_token var → tetiklenmeli."""
    _, factory = engine_and_factory

    cid = await _seed_connection(
        factory,
        connection_id="conn-expired-but-refreshable",
        requires_reauth=False,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        refresh_token="rt-good",
    )
    rid = await _seed_record(
        factory,
        record_id="pub-self-healing",
        status=PublishStatus.SCHEDULED.value,
        scheduled_at=datetime.now(timezone.utc) - timedelta(seconds=1),
        platform_connection_id=cid,
    )

    triggered, due, skipped = await _check_and_trigger(factory)
    assert triggered == 1
    assert due == 1
    assert skipped == 0

    async with factory() as db:
        rec = (await db.execute(
            select(PublishRecord).where(PublishRecord.id == rid)
        )).scalar_one()
        assert rec.status == PublishStatus.PUBLISHING.value


@pytest.mark.asyncio
async def test_scheduler_proceeds_when_no_connection_id(engine_and_factory):
    """platform_connection_id yoksa pre-flight unknown döner ve tetiklenir."""
    _, factory = engine_and_factory
    rid = await _seed_record(
        factory,
        record_id="pub-no-conn",
        status=PublishStatus.SCHEDULED.value,
        scheduled_at=datetime.now(timezone.utc) - timedelta(seconds=1),
        platform_connection_id=None,
    )
    triggered, due, skipped = await _check_and_trigger(factory)
    assert triggered == 1
    assert due == 1
    assert skipped == 0


# ===========================================================================
# Z-1 — bulk_service
# ===========================================================================

@pytest.mark.asyncio
async def test_bulk_approve_only_pending_review_succeeds(engine_and_factory):
    _, factory = engine_and_factory
    ok = await _seed_record(
        factory, record_id="bulk-ok",
        status=PublishStatus.PENDING_REVIEW.value,
        review_state="pending",
    )
    bad = await _seed_record(
        factory, record_id="bulk-bad",
        status=PublishStatus.DRAFT.value,
        review_state="pending",
    )

    resp = await bulk_service.bulk_approve(
        session_factory=factory,
        record_ids=[ok, bad],
        reviewer_id="reviewer-1",
        note="bulk smoke",
    )
    assert resp.action == "approve"
    assert resp.requested == 2
    # At least one should fail (draft cannot be approved via review)
    by_id = {r.record_id: r for r in resp.results}
    assert by_id[ok].ok is True
    assert by_id[bad].ok is False
    assert resp.succeeded >= 1
    assert resp.failed >= 1


@pytest.mark.asyncio
async def test_bulk_reject_requires_reason(engine_and_factory):
    _, factory = engine_and_factory
    rid = await _seed_record(
        factory, record_id="bulk-rej-1",
        status=PublishStatus.PENDING_REVIEW.value,
    )
    with pytest.raises(ValueError):
        await bulk_service.bulk_reject(
            session_factory=factory,
            record_ids=[rid],
            reviewer_id="r-1",
            rejection_reason="",
        )


@pytest.mark.asyncio
async def test_bulk_cancel_per_record_isolation(engine_and_factory):
    """Bir kayıt fail olsa diğeri devam etmeli."""
    _, factory = engine_and_factory
    ok = await _seed_record(
        factory, record_id="cancel-ok",
        status=PublishStatus.SCHEDULED.value,
        review_state="approved",
    )
    # Already terminal — should fail
    bad = await _seed_record(
        factory, record_id="cancel-bad",
        status=PublishStatus.PUBLISHED.value,
    )

    resp = await bulk_service.bulk_cancel(
        session_factory=factory,
        record_ids=[ok, bad],
        actor_id="actor-1",
    )
    by_id = {r.record_id: r for r in resp.results}
    assert by_id[ok].ok is True
    assert by_id[bad].ok is False


@pytest.mark.asyncio
async def test_bulk_dedupes_record_ids(engine_and_factory):
    _, factory = engine_and_factory
    rid = await _seed_record(
        factory, record_id="dedupe-1",
        status=PublishStatus.PENDING_REVIEW.value,
    )
    resp = await bulk_service.bulk_approve(
        session_factory=factory,
        record_ids=[rid, rid, rid],
        reviewer_id="r-1",
    )
    # Only one result emitted because IDs were deduped before processing
    assert resp.requested == 1
    assert len(resp.results) == 1


@pytest.mark.asyncio
async def test_bulk_retry_only_failed_succeeds(engine_and_factory):
    _, factory = engine_and_factory
    failed = await _seed_record(
        factory, record_id="retry-failed",
        status=PublishStatus.FAILED.value,
    )
    pub = await _seed_record(
        factory, record_id="retry-published",
        status=PublishStatus.PUBLISHED.value,
    )
    resp = await bulk_service.bulk_retry(
        session_factory=factory,
        record_ids=[failed, pub],
        actor_id="actor-1",
    )
    by_id = {r.record_id: r for r in resp.results}
    assert by_id[failed].ok is True
    assert by_id[pub].ok is False
