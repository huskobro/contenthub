"""
News items & source scans retention.

Gate Sources Closure adds a background sweeper that deletes rows older than
the configured retention window:

  - ``news_items.retention.days`` (default 180) — NewsItem rows.
    NewsItems still referenced by UsedNewsRegistry are never deleted
    (publish provenance must survive).
  - ``source_scans.retention.days`` (default 90) — SourceScan rows.
    NewsItems carry a foreign-key-like ``source_scan_id`` — when the scan
    row is deleted, NewsItems are simply detached (``source_scan_id`` set
    to NULL). The rows themselves survive the normal news_items window.

Status surface:
  ``RETENTION_STATE`` mirrors the last sweep outcome so admins can verify
  the policy is executing.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, delete, update, func

logger = logging.getLogger(__name__)


RETENTION_STATE: dict = {
    "enabled": True,
    "effective_interval_seconds": 3600,
    "news_item_retention_days": 180,
    "source_scan_retention_days": 90,
    "last_sweep_at": None,
    "last_sweep_ok": None,
    "last_sweep_error": None,
    "last_deleted_news_items": 0,
    "last_deleted_source_scans": 0,
    "last_detached_news_items": 0,
}


async def _resolve_ints(db_session_factory) -> tuple[bool, int, int, int]:
    """Read retention settings. Returns (enabled, news_days, scan_days, poll_interval)."""
    enabled = True
    news_days = 180
    scan_days = 90
    poll_interval = 3600  # 1 hour

    try:
        async with db_session_factory() as db:
            from app.settings.settings_resolver import resolve as _resolve
            raw_enabled = await _resolve("news_items.retention.enabled", db)
            if raw_enabled is not None:
                enabled = bool(raw_enabled)
            raw_news = await _resolve("news_items.retention.days", db)
            if raw_news is not None:
                try:
                    news_days = int(raw_news)
                except (TypeError, ValueError):
                    pass
            raw_scan = await _resolve("source_scans.retention.days", db)
            if raw_scan is not None:
                try:
                    scan_days = int(raw_scan)
                except (TypeError, ValueError):
                    pass
            raw_poll = await _resolve("source_scans.retention.poll_interval_seconds", db)
            if raw_poll is not None:
                try:
                    poll_interval = int(raw_poll)
                except (TypeError, ValueError):
                    pass
    except Exception as exc:
        logger.warning("retention settings read failed: %s", exc)

    # Clamp to safe bounds.
    news_days = max(7, min(news_days, 3650))
    scan_days = max(1, min(scan_days, 3650))
    poll_interval = max(300, min(poll_interval, 86400))
    return enabled, news_days, scan_days, poll_interval


async def _run_sweep(db_session_factory, news_days: int, scan_days: int) -> dict:
    """Single retention sweep. Returns deleted/detached counts."""
    from app.db.models import NewsItem, SourceScan, UsedNewsRegistry

    now = datetime.now(tz=timezone.utc)
    news_cutoff = now - timedelta(days=news_days)
    scan_cutoff = now - timedelta(days=scan_days)

    async with db_session_factory() as db:
        # 1. Delete expired news_items that are NOT referenced by used_news_registry.
        referenced_subq = select(UsedNewsRegistry.news_item_id).distinct().scalar_subquery()
        del_news_result = await db.execute(
            delete(NewsItem)
            .where(NewsItem.created_at < news_cutoff)
            .where(~NewsItem.id.in_(referenced_subq))
        )
        deleted_news = del_news_result.rowcount or 0

        # 2. Detach news_items that still reference a source_scan we're about
        #    to delete (preserve the news_item, null the scan link).
        scan_ids_to_kill_subq = (
            select(SourceScan.id).where(SourceScan.created_at < scan_cutoff)
        ).scalar_subquery()
        detach_result = await db.execute(
            update(NewsItem)
            .where(NewsItem.source_scan_id.in_(scan_ids_to_kill_subq))
            .values(source_scan_id=None)
        )
        detached_items = detach_result.rowcount or 0

        # 3. Delete expired source_scans.
        del_scan_result = await db.execute(
            delete(SourceScan).where(SourceScan.created_at < scan_cutoff)
        )
        deleted_scans = del_scan_result.rowcount or 0

        await db.commit()

    return {
        "deleted_news_items": int(deleted_news),
        "deleted_source_scans": int(deleted_scans),
        "detached_news_items": int(detached_items),
    }


async def poll_retention(
    db_session_factory,
    initial_poll_interval: float = 3600,
) -> None:
    """Background retention task. Re-reads settings on every tick."""
    logger.info("Retention scheduler started (initial interval=%ss).", initial_poll_interval)

    # Initial read.
    try:
        enabled, news_days, scan_days, interval = await _resolve_ints(db_session_factory)
        RETENTION_STATE["enabled"] = enabled
        RETENTION_STATE["news_item_retention_days"] = news_days
        RETENTION_STATE["source_scan_retention_days"] = scan_days
        RETENTION_STATE["effective_interval_seconds"] = interval
        current_interval = interval
    except Exception:
        current_interval = float(initial_poll_interval)

    while True:
        try:
            await asyncio.sleep(current_interval)
            enabled, news_days, scan_days, interval = await _resolve_ints(db_session_factory)
            RETENTION_STATE["enabled"] = enabled
            RETENTION_STATE["news_item_retention_days"] = news_days
            RETENTION_STATE["source_scan_retention_days"] = scan_days
            RETENTION_STATE["effective_interval_seconds"] = interval
            RETENTION_STATE["last_sweep_at"] = datetime.now(timezone.utc).isoformat()
            current_interval = interval

            if not enabled:
                RETENTION_STATE["last_sweep_ok"] = True
                RETENTION_STATE["last_sweep_error"] = None
                RETENTION_STATE["last_deleted_news_items"] = 0
                RETENTION_STATE["last_deleted_source_scans"] = 0
                RETENTION_STATE["last_detached_news_items"] = 0
                continue

            result = await _run_sweep(db_session_factory, news_days, scan_days)
            RETENTION_STATE["last_sweep_ok"] = True
            RETENTION_STATE["last_sweep_error"] = None
            RETENTION_STATE["last_deleted_news_items"] = result["deleted_news_items"]
            RETENTION_STATE["last_deleted_source_scans"] = result["deleted_source_scans"]
            RETENTION_STATE["last_detached_news_items"] = result["detached_news_items"]

            if (
                result["deleted_news_items"]
                or result["deleted_source_scans"]
                or result["detached_news_items"]
            ):
                logger.info(
                    "Retention sweep: -%d news_items, -%d source_scans, ~%d detached",
                    result["deleted_news_items"],
                    result["deleted_source_scans"],
                    result["detached_news_items"],
                )
        except asyncio.CancelledError:
            logger.info("Retention scheduler cancelled.")
            break
        except Exception as exc:
            RETENTION_STATE["last_sweep_ok"] = False
            RETENTION_STATE["last_sweep_error"] = str(exc)
            logger.warning("Retention sweep error: %s", exc)
