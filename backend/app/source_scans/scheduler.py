"""
Source Auto-Scan Scheduler.

Background async task that polls for sources with scan_mode='auto'
and triggers RSS scans automatically.

Safety:
  - Checks for existing queued/running scans to prevent duplicates
  - Respects cooldown interval per source
  - Individual source failures don't kill the loop
  - Batch limit prevents overload
  - Graceful shutdown via CancelledError
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsSource, SourceScan

logger = logging.getLogger(__name__)

_DEFAULT_INTERVAL = 300  # 5 minutes
_BATCH_LIMIT = 5


async def poll_auto_scans(
    db_session_factory,
    interval: float = _DEFAULT_INTERVAL,
) -> None:
    """Background task: poll for auto-scannable sources and trigger scans."""
    logger.info("Auto-scan scheduler started (interval=%ss)", interval)
    while True:
        try:
            await asyncio.sleep(interval)
            count = await _check_and_scan(db_session_factory, interval)
            if count > 0:
                logger.info("Auto-scan scheduler triggered %d scan(s).", count)
        except asyncio.CancelledError:
            logger.info("Auto-scan scheduler cancelled.")
            break
        except Exception as exc:
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
                except Exception:
                    pass

            except Exception as exc:
                logger.warning(
                    "Auto-scan failed for source %s: %s",
                    source.id, exc,
                )

    return triggered
