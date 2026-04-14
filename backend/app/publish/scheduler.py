"""
Publish Scheduler — M11 + Gate 4 health tracking.

Background async task that polls for scheduled publishes
(PublishRecord.status == 'scheduled' AND scheduled_at <= now).

Runs as an asyncio task during the app lifespan.
Polling interval is configurable via settings.

Gate 4 (Publish Closure):
  Each tick writes a small status snapshot to
  `app.state.publish_scheduler_status` (in-memory only — no DB writes,
  no historical analytics). The /publish/scheduler/status endpoint reads
  this snapshot and reports state ∈ {healthy, stale, unknown}.

Safety:
  - Transitions scheduled -> publishing before executing
  - If transition fails (race condition), skips silently
  - Logs all activity
  - Never raises — loop continues on error
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PublishRecord

logger = logging.getLogger(__name__)

_DEFAULT_INTERVAL = 60  # seconds
# YouTube Analytics daily sync — cekme sikligi ve en son sync bilgisini
# YouTubeAnalyticsSyncLog'dan okuyarak gun basina en fazla bir kez calistiririz.
_ANALYTICS_POLL_INTERVAL = 3600  # her saatte bir durum kontrol
_ANALYTICS_DEFAULT_INTERVAL_HOURS = 24  # settings yoksa 24 saat

# Gate 4: a tick is "stale" if it hasn't fired within this many seconds of
# its expected interval. Default = interval * 3 (covers a few missed ticks
# without false alarms during heavy app load). Computed per-call so tests
# can pass smaller intervals.
SCHEDULER_STALE_THRESHOLD_SECONDS = max(_DEFAULT_INTERVAL * 3, 180)


def _empty_status(interval: float) -> dict[str, Any]:
    """Initial scheduler status payload — written before the first tick."""
    return {
        "started_at": datetime.now(timezone.utc),
        "last_tick_at": None,
        "last_due_count": 0,
        "last_triggered_count": 0,
        "last_skipped_count": 0,
        "total_ticks": 0,
        "total_triggered": 0,
        "total_skipped": 0,
        "consecutive_errors": 0,
        "last_error": None,
        "interval_seconds": float(interval),
    }


def _record_tick(
    status: dict[str, Any],
    *,
    due_count: int,
    triggered: int,
    skipped: int = 0,
    error: Optional[str] = None,
) -> None:
    """Update the in-memory scheduler status dict atomically (single-thread)."""
    now = datetime.now(timezone.utc)
    status["last_tick_at"] = now
    status["last_due_count"] = due_count
    status["last_triggered_count"] = triggered
    status["last_skipped_count"] = skipped
    status["total_ticks"] = int(status.get("total_ticks", 0)) + 1
    status["total_triggered"] = int(status.get("total_triggered", 0)) + triggered
    status["total_skipped"] = int(status.get("total_skipped", 0)) + skipped
    if error:
        status["consecutive_errors"] = int(status.get("consecutive_errors", 0)) + 1
        status["last_error"] = error
    else:
        status["consecutive_errors"] = 0
        status["last_error"] = None


def snapshot_scheduler_status(
    raw: Optional[dict[str, Any]],
    *,
    now: Optional[datetime] = None,
    stale_threshold_seconds: float = SCHEDULER_STALE_THRESHOLD_SECONDS,
) -> dict[str, Any]:
    """
    Project the in-memory scheduler dict into a serializable snapshot
    with a derived `state` field ∈ {unknown, healthy, stale}.

    Used by both the /scheduler/status endpoint and tests. Pure function.
    """
    now = now or datetime.now(timezone.utc)
    if raw is None:
        return {
            "state": "unknown",
            "started_at": None,
            "last_tick_at": None,
            "last_due_count": 0,
            "last_triggered_count": 0,
            "last_skipped_count": 0,
            "total_ticks": 0,
            "total_triggered": 0,
            "total_skipped": 0,
            "consecutive_errors": 0,
            "last_error": None,
            "interval_seconds": 0.0,
        }
    last_tick = raw.get("last_tick_at")
    if last_tick is None:
        state = "unknown"
    else:
        # Normalize naive datetimes to UTC (defensive — tests may pass naive).
        if last_tick.tzinfo is None:
            last_tick = last_tick.replace(tzinfo=timezone.utc)
        delta = (now - last_tick).total_seconds()
        state = "healthy" if delta <= stale_threshold_seconds else "stale"
    return {
        "state": state,
        "started_at": raw.get("started_at"),
        "last_tick_at": raw.get("last_tick_at"),
        "last_due_count": int(raw.get("last_due_count", 0)),
        "last_triggered_count": int(raw.get("last_triggered_count", 0)),
        "last_skipped_count": int(raw.get("last_skipped_count", 0)),
        "total_ticks": int(raw.get("total_ticks", 0)),
        "total_triggered": int(raw.get("total_triggered", 0)),
        "total_skipped": int(raw.get("total_skipped", 0)),
        "consecutive_errors": int(raw.get("consecutive_errors", 0)),
        "last_error": raw.get("last_error"),
        "interval_seconds": float(raw.get("interval_seconds", 0.0)),
    }


async def poll_scheduled_publishes(
    db_session_factory,
    interval: float = _DEFAULT_INTERVAL,
    *,
    status_holder: Optional[dict[str, Any]] = None,
) -> None:
    """
    Infinite loop that checks for due scheduled publishes.

    This function is designed to run as an asyncio.Task.
    It catches all exceptions to prevent the loop from dying.

    Gate 4: if `status_holder` is provided, each tick updates it in place.
    Main wires `app.state.publish_scheduler_status = {}` and passes it.
    """
    if status_holder is not None:
        # Fresh start — overwrite the holder fields with initial values.
        status_holder.clear()
        status_holder.update(_empty_status(interval))
    logger.info("Publish scheduler started (interval=%ss)", interval)
    while True:
        try:
            await asyncio.sleep(interval)
            count, due, skipped = await _check_and_trigger(db_session_factory)
            if status_holder is not None:
                _record_tick(
                    status_holder,
                    due_count=due,
                    triggered=count,
                    skipped=skipped,
                )
            if count > 0:
                logger.info("Scheduler triggered %d scheduled publish(es).", count)
            if skipped > 0:
                logger.info(
                    "Scheduler skipped %d scheduled publish(es) due to "
                    "blocking token pre-flight (requires_reauth).",
                    skipped,
                )
        except asyncio.CancelledError:
            logger.info("Publish scheduler cancelled.")
            break
        except Exception as exc:
            logger.warning("Publish scheduler error: %s", exc)
            if status_holder is not None:
                _record_tick(
                    status_holder,
                    due_count=0,
                    triggered=0,
                    skipped=0,
                    error=str(exc),
                )
            # Continue — scheduler must not die


async def _check_and_trigger(db_session_factory) -> tuple[int, int, int]:
    """
    Check for due scheduled publishes and trigger them.

    Returns (triggered_count, due_count, skipped_count). Gate 4: due_count
    is reported via the in-memory scheduler status so the admin UI can
    show "X due in last tick" even when triggering failed. skipped_count
    surfaces token pre-flight blocks (requires_reauth) so operators see
    that the scheduler is healthy AND that the records are intentionally
    waiting on connection reauth.
    """
    now = datetime.now(timezone.utc)
    triggered = 0
    skipped = 0

    # Local import — token_preflight imports models which transitively pull
    # publish.scheduler in some test fixtures; keeping it lazy avoids cycles.
    from app.publish.token_preflight import assert_publish_token_ready

    async with db_session_factory() as db:
        stmt = (
            select(PublishRecord)
            .where(
                PublishRecord.status == "scheduled",
                PublishRecord.scheduled_at.is_not(None),
                PublishRecord.scheduled_at <= now,
            )
            .limit(10)  # batch limit to prevent overload
        )
        result = await db.execute(stmt)
        records = list(result.scalars().all())
        due_count = len(records)

        for record in records:
            # Gate 4 (Z-4): NON-AGGRESSIVE token pre-flight.
            # Only blocks when connection.requires_reauth is True. Expired
            # access tokens with refresh_token are considered self-healing
            # and proceed to trigger_publish (the platform adapter will
            # transparently refresh the token).
            try:
                token_status = await assert_publish_token_ready(
                    db, record.platform_connection_id, now=now,
                )
            except Exception as exc:
                logger.warning(
                    "Token pre-flight failed for record_id=%s: %s "
                    "(continuing — pre-flight is non-aggressive)",
                    record.id, exc,
                )
                token_status = None

            if token_status is not None and token_status.is_blocking:
                skipped += 1
                logger.info(
                    "Scheduler skipped record_id=%s: token pre-flight "
                    "blocking (severity=%s, requires_reauth=%s).",
                    record.id, token_status.severity,
                    token_status.requires_reauth,
                )
                # Audit the skip so the operator sees why the publish did
                # not fire (visibility rule). State is NOT mutated — the
                # record stays 'scheduled' and will retry on the next tick
                # once the operator reauths the connection.
                try:
                    from app.audit.service import write_audit_log
                    await write_audit_log(
                        db, action="publish.scheduler.skip_reauth",
                        entity_type="publish_record",
                        entity_id=record.id,
                        details={
                            "scheduled_at": str(record.scheduled_at),
                            "severity": token_status.severity,
                            "platform_connection_id": record.platform_connection_id,
                        },
                    )
                    await db.commit()
                except Exception as exc:
                    logger.warning(
                        "Audit log write failed (publish.scheduler.skip_reauth): %s",
                        exc,
                    )
                continue

            try:
                # Import here to avoid circular imports
                from app.publish.service import trigger_publish

                # Transition: scheduled -> publishing
                await trigger_publish(
                    db, record.id,
                    actor_id="publish_scheduler",
                    note="Scheduler triggered: scheduled_at={}.".format(record.scheduled_at),
                )
                triggered += 1
                logger.info(
                    "Scheduler triggered publish: record_id=%s, scheduled_at=%s",
                    record.id, record.scheduled_at,
                )

                # Audit log
                # write_audit_log only flushes — caller must commit so the
                # AuditLog row survives session close. Without this commit,
                # the trigger itself was committed (inside trigger_publish)
                # but the audit row would silently roll back.
                try:
                    from app.audit.service import write_audit_log
                    await write_audit_log(
                        db, action="publish.scheduler.trigger",
                        entity_type="publish_record",
                        entity_id=record.id,
                        details={"scheduled_at": str(record.scheduled_at)},
                    )
                    await db.commit()
                except Exception as exc:
                    logger.warning("Audit log write failed (publish.scheduler): %s", exc)

            except Exception as exc:
                logger.warning(
                    "Scheduler failed to trigger publish record_id=%s: %s",
                    record.id, exc,
                )

    return triggered, due_count, skipped


# ============================================================================
# YouTube Analytics daily sync (Sprint 1 / Faz YT-A1)
# ============================================================================


async def poll_youtube_analytics_daily(
    db_session_factory,
    interval: float = _ANALYTICS_POLL_INTERVAL,
) -> None:
    """
    Background loop that runs YouTubeAnalyticsService.run_daily_sync_all
    approximately every `publish.youtube.analytics.sync_interval_hours`
    hours. Per-connection tracking uses YouTubeAnalyticsSyncLog rows.
    """
    logger.info(
        "YouTube Analytics daily sync loop started (poll interval=%ss).", interval,
    )
    while True:
        try:
            await asyncio.sleep(interval)
            await _maybe_run_analytics_sync(db_session_factory)
        except asyncio.CancelledError:
            logger.info("YouTube Analytics sync loop cancelled.")
            break
        except Exception as exc:  # noqa: BLE001
            logger.warning("YouTube Analytics sync loop error: %s", exc)


async def _maybe_run_analytics_sync(db_session_factory) -> None:
    """Run analytics sync if enough time passed since last run."""
    from app.analytics.youtube_analytics_service import YouTubeAnalyticsService
    from app.db.models import YouTubeAnalyticsSyncLog
    from app.settings.settings_resolver import resolve as resolve_setting

    async with db_session_factory() as db:
        # Read desired interval from settings registry (fallback 24h)
        try:
            interval_raw = await resolve_setting(
                "publish.youtube.analytics.sync_interval_hours", db,
            )
            interval_hours = float(
                interval_raw if interval_raw is not None
                else _ANALYTICS_DEFAULT_INTERVAL_HOURS
            )
        except Exception:
            interval_hours = _ANALYTICS_DEFAULT_INTERVAL_HOURS

        # Find newest sync log row across all connections
        stmt = (
            select(YouTubeAnalyticsSyncLog)
            .order_by(YouTubeAnalyticsSyncLog.started_at.desc())
            .limit(1)
        )
        last = (await db.execute(stmt)).scalars().first()
        now = datetime.now(timezone.utc)
        if last and last.started_at:
            # Normalize timezone: SQLite returns naive datetime
            started = last.started_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            if now - started < timedelta(hours=interval_hours):
                return  # too soon

        logger.info(
            "YouTube Analytics daily sync — triggering run_daily_sync_all.",
        )
        service = YouTubeAnalyticsService()
        results = await service.run_daily_sync_all(
            db, trigger_source="scheduler",
        )
        logger.info(
            "YouTube Analytics daily sync completed: %d connections processed.",
            len(results),
        )
