"""
Publish Scheduler — M11.

Background async task that polls for scheduled publishes
(PublishRecord.status == 'scheduled' AND scheduled_at <= now).

Runs as an asyncio task during the app lifespan.
Polling interval is configurable via settings.

Safety:
  - Transitions scheduled -> publishing before executing
  - If transition fails (race condition), skips silently
  - Logs all activity
  - Never raises — loop continues on error
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PublishRecord

logger = logging.getLogger(__name__)

_DEFAULT_INTERVAL = 60  # seconds


async def poll_scheduled_publishes(
    db_session_factory,
    interval: float = _DEFAULT_INTERVAL,
) -> None:
    """
    Infinite loop that checks for due scheduled publishes.

    This function is designed to run as an asyncio.Task.
    It catches all exceptions to prevent the loop from dying.
    """
    logger.info("Publish scheduler started (interval=%ss)", interval)
    while True:
        try:
            await asyncio.sleep(interval)
            count = await _check_and_trigger(db_session_factory)
            if count > 0:
                logger.info("Scheduler triggered %d scheduled publish(es).", count)
        except asyncio.CancelledError:
            logger.info("Publish scheduler cancelled.")
            break
        except Exception as exc:
            logger.warning("Publish scheduler error: %s", exc)
            # Continue — scheduler must not die


async def _check_and_trigger(db_session_factory) -> int:
    """Check for due scheduled publishes and trigger them. Returns count."""
    now = datetime.now(timezone.utc)
    triggered = 0

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

        for record in records:
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
                try:
                    from app.audit.service import write_audit_log
                    await write_audit_log(
                        db, action="publish.scheduler.trigger",
                        entity_type="publish_record",
                        entity_id=record.id,
                        details={"scheduled_at": str(record.scheduled_at)},
                    )
                except Exception:
                    pass  # Audit failure must not break scheduler

            except Exception as exc:
                logger.warning(
                    "Scheduler failed to trigger publish record_id=%s: %s",
                    record.id, exc,
                )

    return triggered
