"""
Source Auto-Scan Scheduler.

Background async task that polls for sources with scan_mode='auto'
and triggers RSS scans automatically.

Settings wire (Gate Sources Closure):
  - ``source_scans.auto_scan_enabled`` (boolean) — kill switch, re-read per tick.
  - ``source_scans.auto_scan_interval_seconds`` (integer 60..86400) — polling
    cadence AND per-source cooldown, re-read per tick.
  When disabled the loop still runs but each tick is a no-op — no scans
  are triggered. This lets admins toggle auto-scan from Settings without
  restarting the backend.

Safety:
  - Checks for existing queued/running scans to prevent duplicates
  - Respects cooldown interval per source (= current interval setting)
  - Individual source failures don't kill the loop
  - Batch limit prevents overload
  - Graceful shutdown via CancelledError

Status surface:
  - ``SCHEDULER_STATE`` mirrors effective settings + last tick outcome so the
    admin Auto-Scan health endpoint can expose it without querying settings.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsSource, SourceScan
from app.settings.settings_resolver import resolve

logger = logging.getLogger(__name__)

_DEFAULT_INTERVAL = 300  # 5 minutes — fallback when setting missing/invalid
_MIN_INTERVAL = 60       # matches KNOWN_SETTINGS validation
_MAX_INTERVAL = 86400
_BATCH_LIMIT = 5


# In-memory status — NOT persisted. Single-process MVP.
SCHEDULER_STATE: dict = {
    "enabled": False,
    "effective_interval_seconds": _DEFAULT_INTERVAL,
    "last_tick_at": None,
    "last_tick_ok": None,
    "last_tick_error": None,
    "last_triggered_count": 0,
    "skipped_because_disabled": False,
}


def _clamp_interval(raw: object) -> float:
    """Clamp interval to [_MIN_INTERVAL, _MAX_INTERVAL] with fallback."""
    try:
        val = float(raw) if raw is not None else float(_DEFAULT_INTERVAL)
    except (TypeError, ValueError):
        val = float(_DEFAULT_INTERVAL)
    if val < _MIN_INTERVAL:
        val = float(_MIN_INTERVAL)
    if val > _MAX_INTERVAL:
        val = float(_MAX_INTERVAL)
    return val


async def _read_effective_settings(db_session_factory) -> tuple[bool, float]:
    """Read auto_scan_enabled + interval from Settings Registry."""
    async with db_session_factory() as db:
        enabled_raw = await resolve("source_scans.auto_scan_enabled", db)
        interval_raw = await resolve("source_scans.auto_scan_interval_seconds", db)
    enabled = bool(enabled_raw) if enabled_raw is not None else True
    interval = _clamp_interval(interval_raw)
    return enabled, interval


async def poll_auto_scans(
    db_session_factory,
    interval: float = _DEFAULT_INTERVAL,  # kept for backward-compat signature
) -> None:
    """Background task: poll for auto-scannable sources and trigger scans.

    The ``interval`` arg is only used as the initial sleep bound. Real cadence
    is read from the Settings Registry on every tick so admin toggles take
    effect without a restart.
    """
    logger.info("Auto-scan scheduler started (initial interval=%ss, live-reload).", interval)
    # Read initial settings once so logs reflect actual state.
    try:
        enabled0, interval0 = await _read_effective_settings(db_session_factory)
        SCHEDULER_STATE["enabled"] = enabled0
        SCHEDULER_STATE["effective_interval_seconds"] = interval0
        current_interval = interval0
    except Exception as exc:  # pragma: no cover — defensive
        logger.warning("Auto-scan initial settings read failed: %s", exc)
        current_interval = _clamp_interval(interval)

    while True:
        try:
            await asyncio.sleep(current_interval)
            enabled, new_interval = await _read_effective_settings(db_session_factory)
            SCHEDULER_STATE["enabled"] = enabled
            SCHEDULER_STATE["effective_interval_seconds"] = new_interval
            SCHEDULER_STATE["last_tick_at"] = datetime.now(timezone.utc).isoformat()
            current_interval = new_interval

            if not enabled:
                SCHEDULER_STATE["skipped_because_disabled"] = True
                SCHEDULER_STATE["last_tick_ok"] = True
                SCHEDULER_STATE["last_tick_error"] = None
                SCHEDULER_STATE["last_triggered_count"] = 0
                logger.debug("Auto-scan tick skipped (source_scans.auto_scan_enabled=False).")
                continue

            SCHEDULER_STATE["skipped_because_disabled"] = False
            count = await _check_and_scan(db_session_factory, new_interval)
            SCHEDULER_STATE["last_tick_ok"] = True
            SCHEDULER_STATE["last_tick_error"] = None
            SCHEDULER_STATE["last_triggered_count"] = count
            if count > 0:
                logger.info("Auto-scan scheduler triggered %d scan(s).", count)
        except asyncio.CancelledError:
            logger.info("Auto-scan scheduler cancelled.")
            break
        except Exception as exc:
            SCHEDULER_STATE["last_tick_ok"] = False
            SCHEDULER_STATE["last_tick_error"] = str(exc)
            logger.warning("Auto-scan scheduler error: %s", exc)


async def _check_and_scan(db_session_factory, interval: float) -> int:
    """Check for auto-scannable sources and trigger scans. Returns count."""
    triggered = 0
    now = datetime.now(timezone.utc)
    cooldown_cutoff = now - timedelta(seconds=interval)

    async with db_session_factory() as db:
        # Find auto-scannable active sources
        stmt = (
            select(NewsSource)
            .where(
                NewsSource.scan_mode == "auto",
                NewsSource.status == "active",
            )
            .limit(_BATCH_LIMIT)
        )
        result = await db.execute(stmt)
        sources = list(result.scalars().all())

        for source in sources:
            try:
                # Check for existing queued/running scan
                existing_stmt = (
                    select(SourceScan.id)
                    .where(
                        SourceScan.source_id == source.id,
                        SourceScan.status.in_(["queued", "running"]),
                    )
                    .limit(1)
                )
                existing = await db.execute(existing_stmt)
                if existing.scalar_one_or_none() is not None:
                    logger.debug(
                        "Auto-scan skipped source %s: existing queued/running scan.",
                        source.id,
                    )
                    continue

                # Cooldown check: last completed scan must be older than interval
                last_scan_stmt = (
                    select(SourceScan.finished_at)
                    .where(
                        SourceScan.source_id == source.id,
                        SourceScan.status == "completed",
                    )
                    .order_by(SourceScan.finished_at.desc())
                    .limit(1)
                )
                last_result = await db.execute(last_scan_stmt)
                last_finished = last_result.scalar_one_or_none()
                # SQLite may return naive datetime — normalize to UTC-aware
                if last_finished is not None and last_finished.tzinfo is None:
                    last_finished = last_finished.replace(tzinfo=timezone.utc)
                if last_finished is not None and last_finished > cooldown_cutoff:
                    logger.debug(
                        "Auto-scan skipped source %s: cooldown (last=%s, cutoff=%s).",
                        source.id, last_finished, cooldown_cutoff,
                    )
                    continue

                # Create scan record
                scan = SourceScan(
                    source_id=source.id,
                    scan_mode="auto",
                    status="queued",
                    requested_by="auto_scheduler",
                )
                db.add(scan)
                await db.commit()
                await db.refresh(scan)

                # Execute the scan
                from app.source_scans.scan_engine import execute_rss_scan
                try:
                    await execute_rss_scan(db, scan.id, allow_followup=False)
                    triggered += 1
                    logger.info(
                        "Auto-scan completed: source=%s (%s), scan=%s",
                        source.name, source.id, scan.id,
                    )
                except Exception as scan_exc:
                    logger.warning(
                        "Auto-scan execution failed for source %s: %s",
                        source.id, scan_exc,
                    )

                # Audit log (best effort)
                try:
                    from app.audit.service import write_audit_log
                    await write_audit_log(
                        db,
                        action="source_scan.auto_trigger",
                        entity_type="source_scan",
                        entity_id=scan.id,
                        details={"source_id": source.id, "source_name": source.name},
                    )
                    await db.commit()
                except Exception as exc:
                    logger.warning("Audit log write failed (source_scan.auto_trigger): %s", exc)

            except Exception as exc:
                logger.warning(
                    "Auto-scan failed for source %s: %s",
                    source.id, exc,
                )

    return triggered
