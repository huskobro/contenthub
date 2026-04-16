"""
Full-Auto project scheduler — in-process periodic tick.

Checks every ``automation.scheduler.poll_interval_seconds`` for projects with
``automation_enabled=True`` and ``automation_schedule_enabled=True`` whose
``automation_next_run_at`` is due. For each due project:

  1. Compute a unique ``scheduled_run_id`` = f"{project.id}:{run_at_iso}".
  2. Call :func:`app.full_auto.service.trigger_full_auto` (guard-checked).
  3. Re-compute ``automation_next_run_at`` from the cron expression.

This scheduler never dies on errors: all exceptions are caught and logged so
the tick loop continues. Cancellation is honored for graceful shutdown.

Status is reported via an in-memory dict exposed at module level
(:data:`SCHEDULER_STATE`). The HTTP status endpoint reads from it.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ContentProject
from app.full_auto.cron import compute_next_run, is_valid_cron
from app.full_auto.service import (
    SUPPORTED_MODULES_V1,
    get_global_automation_config,
    trigger_full_auto,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# In-memory status — NOT persisted. Safe for single-process MVP.
# ---------------------------------------------------------------------------

SCHEDULER_STATE: dict = {
    "enabled": False,
    "poll_interval_seconds": 60,
    "last_tick_at": None,
    "last_tick_ok": None,
    "last_tick_error": None,
    "pending_project_count": 0,
    "next_candidate_project_id": None,
    "next_candidate_run_at": None,
}


# ---------------------------------------------------------------------------
# Tick
# ---------------------------------------------------------------------------

async def _run_tick(
    db_session_factory,
    dispatcher,
) -> int:
    """Single tick — returns how many triggers were attempted."""
    triggered = 0
    async with db_session_factory() as db:  # type: AsyncSession
        cfg = await get_global_automation_config(db)

        SCHEDULER_STATE["enabled"] = bool(cfg.get("automation.scheduler.enabled"))
        SCHEDULER_STATE["poll_interval_seconds"] = int(
            cfg.get("automation.scheduler.poll_interval_seconds") or 60
        )

        if not cfg.get("automation.scheduler.enabled"):
            SCHEDULER_STATE["pending_project_count"] = 0
            SCHEDULER_STATE["next_candidate_project_id"] = None
            SCHEDULER_STATE["next_candidate_run_at"] = None
            return 0

        if not cfg.get("automation.full_auto.enabled"):
            return 0

        now = datetime.now(timezone.utc)

        # PHASE AG: module_type IN SUPPORTED_MODULES_V1 filtresi, mixed/None
        # module'lu projeleri dogal olarak disari birakir (pause davranisi).
        # Ayrica evaluate_guards mixed proje icin acik violation doner.
        q = select(ContentProject).where(
            and_(
                ContentProject.automation_enabled == True,  # noqa: E712
                ContentProject.automation_schedule_enabled == True,  # noqa: E712
                ContentProject.module_type.in_(SUPPORTED_MODULES_V1),
            )
        )
        result = await db.execute(q)
        projects = list(result.scalars().all())

        # Recompute next_run for projects missing it + collect due ones
        due: list[ContentProject] = []
        next_candidate: Optional[ContentProject] = None
        for p in projects:
            if not p.automation_cron_expression or not is_valid_cron(p.automation_cron_expression):
                continue
            if p.automation_next_run_at is None:
                nxt = compute_next_run(p.automation_cron_expression, now=now)
                p.automation_next_run_at = nxt
                continue
            nra = p.automation_next_run_at
            if nra.tzinfo is None:
                nra = nra.replace(tzinfo=timezone.utc)
            if nra <= now:
                due.append(p)
            else:
                if (
                    next_candidate is None
                    or nra < next_candidate.automation_next_run_at.replace(tzinfo=timezone.utc)
                ):
                    next_candidate = p

        await db.commit()  # persist any recomputed next_run_at

        SCHEDULER_STATE["pending_project_count"] = len(due)
        if next_candidate is not None:
            SCHEDULER_STATE["next_candidate_project_id"] = next_candidate.id
            SCHEDULER_STATE["next_candidate_run_at"] = next_candidate.automation_next_run_at
        else:
            SCHEDULER_STATE["next_candidate_project_id"] = None
            SCHEDULER_STATE["next_candidate_run_at"] = None

        # Trigger each due project in its own session to isolate failures.
        for project in due:
            run_at_iso = project.automation_next_run_at.astimezone(timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )
            scheduled_run_id = f"{project.id}:{run_at_iso}"

            async with db_session_factory() as inner:  # type: AsyncSession
                try:
                    response = await trigger_full_auto(
                        inner,
                        project_id=project.id,
                        dispatcher=dispatcher,
                        session_factory=db_session_factory,
                        trigger_source="scheduled",
                        scheduled_run_id=scheduled_run_id,
                        actor_id=None,
                    )
                    if response.accepted:
                        triggered += 1
                        logger.info(
                            "full_auto scheduler: triggered project=%s job=%s run=%s",
                            project.id, response.job_id, scheduled_run_id,
                        )
                    else:
                        logger.info(
                            "full_auto scheduler: project=%s rejected: %s",
                            project.id, response.reason,
                        )
                except Exception as exc:
                    logger.warning(
                        "full_auto scheduler: trigger failed for project=%s: %s",
                        project.id, exc,
                    )

            # Recompute next_run_at relative to the just-fired time.
            async with db_session_factory() as inner:  # type: AsyncSession
                p_reloaded = await inner.get(ContentProject, project.id)
                if p_reloaded is not None and p_reloaded.automation_cron_expression:
                    nxt = compute_next_run(
                        p_reloaded.automation_cron_expression,
                        now=datetime.now(timezone.utc),
                    )
                    p_reloaded.automation_next_run_at = nxt
                    await inner.commit()

    return triggered


async def poll_full_auto_projects(
    db_session_factory,
    dispatcher,
    *,
    interval: float = 60.0,
) -> None:
    """Infinite tick loop. Never dies on errors; honors cancellation."""
    logger.info("Full-Auto scheduler started (interval=%ss)", interval)
    while True:
        try:
            await asyncio.sleep(interval)
            count = await _run_tick(db_session_factory, dispatcher)
            SCHEDULER_STATE["last_tick_at"] = datetime.now(timezone.utc)
            SCHEDULER_STATE["last_tick_ok"] = True
            SCHEDULER_STATE["last_tick_error"] = None
            if count > 0:
                logger.info("Full-Auto scheduler: triggered %s run(s).", count)
        except asyncio.CancelledError:
            logger.info("Full-Auto scheduler cancelled.")
            break
        except Exception as exc:
            SCHEDULER_STATE["last_tick_at"] = datetime.now(timezone.utc)
            SCHEDULER_STATE["last_tick_ok"] = False
            SCHEDULER_STATE["last_tick_error"] = str(exc)
            logger.warning("Full-Auto scheduler tick error: %s", exc)
            # Continue — scheduler must not die
