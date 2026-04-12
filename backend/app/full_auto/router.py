"""HTTP routes for Full-Auto Mode v1.

Endpoints (all mounted under ``/full-auto``):
  GET    /content-projects/{project_id}         — read project automation config
  PATCH  /content-projects/{project_id}         — update project automation config
  POST   /content-projects/{project_id}/trigger — manual click-to-run trigger
  GET    /scheduler/status                      — read scheduler tick state
  POST   /content-projects/{project_id}/evaluate — dry-run guard check
  GET    /cron/preview                          — next fire time for an expression
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.visibility.dependencies import get_active_user_id
from app.db.models import ContentProject
from app.db.session import get_db
from app.full_auto import service as fa_service
from app.full_auto.cron import compute_next_run, is_valid_cron
from app.full_auto.schemas import (
    FullAutoTriggerRequest,
    FullAutoTriggerResponse,
    GuardCheckResult,
    ProjectAutomationConfig,
    ProjectAutomationConfigUpdate,
    SchedulerStatus,
)
from app.full_auto.scheduler import SCHEDULER_STATE

router = APIRouter(prefix="/full-auto", tags=["Full-Auto"])


# ---------------------------------------------------------------------------
# Project automation config — GET / PATCH
# ---------------------------------------------------------------------------

def _project_to_config(project: ContentProject) -> ProjectAutomationConfig:
    return ProjectAutomationConfig(
        automation_enabled=project.automation_enabled,
        automation_run_mode=project.automation_run_mode,
        automation_schedule_enabled=project.automation_schedule_enabled,
        automation_cron_expression=project.automation_cron_expression,
        automation_timezone=project.automation_timezone,
        automation_default_template_id=project.automation_default_template_id,
        automation_default_blueprint_id=project.automation_default_blueprint_id,
        automation_require_review_gate=project.automation_require_review_gate,
        automation_publish_policy=project.automation_publish_policy,
        automation_fallback_on_error=project.automation_fallback_on_error,
        automation_max_runs_per_day=project.automation_max_runs_per_day,
        automation_last_run_at=project.automation_last_run_at,
        automation_next_run_at=project.automation_next_run_at,
        automation_runs_today=project.automation_runs_today,
        automation_runs_today_date=project.automation_runs_today_date,
    )


@router.get(
    "/content-projects/{project_id}",
    response_model=ProjectAutomationConfig,
)
async def get_project_automation_config(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(ContentProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    return _project_to_config(project)


@router.patch(
    "/content-projects/{project_id}",
    response_model=ProjectAutomationConfig,
)
async def update_project_automation_config(
    project_id: str,
    payload: ProjectAutomationConfigUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_active_user_id),
):
    project = await db.get(ContentProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")

    updates = payload.model_dump(exclude_unset=True)

    # Cron validation — must be parseable if present
    if updates.get("automation_cron_expression"):
        if not is_valid_cron(updates["automation_cron_expression"]):
            raise HTTPException(
                status_code=400,
                detail=f"Gecersiz cron ifadesi: {updates['automation_cron_expression']}",
            )
        # Pre-compute next_run_at so scheduler sees it on the next tick
        next_run = compute_next_run(updates["automation_cron_expression"])
        project.automation_next_run_at = next_run
    elif updates.get("automation_schedule_enabled") is False:
        project.automation_next_run_at = None

    project = await fa_service.apply_config_update(
        db, project, updates, actor_id=user_id
    )
    return _project_to_config(project)


# ---------------------------------------------------------------------------
# Dry-run guard evaluation (useful for UI "would this work?" feedback)
# ---------------------------------------------------------------------------

@router.post(
    "/content-projects/{project_id}/evaluate",
    response_model=GuardCheckResult,
)
async def evaluate_project_automation(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(ContentProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    return await fa_service.evaluate_guards(db, project)


# ---------------------------------------------------------------------------
# Manual trigger (click-to-run)
# ---------------------------------------------------------------------------

@router.post(
    "/content-projects/{project_id}/trigger",
    response_model=FullAutoTriggerResponse,
)
async def trigger_project_full_auto(
    project_id: str,
    request: Request,
    payload: Optional[FullAutoTriggerRequest] = None,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_active_user_id),
):
    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is None:
        raise HTTPException(status_code=503, detail="JobDispatcher hazir degil.")

    session_factory = getattr(request.app.state, "session_factory", None)
    if session_factory is None:
        from app.db.session import AsyncSessionLocal
        session_factory = AsyncSessionLocal

    return await fa_service.trigger_full_auto(
        db,
        project_id=project_id,
        dispatcher=dispatcher,
        session_factory=session_factory,
        payload=payload,
        trigger_source="manual",
        scheduled_run_id=None,
        actor_id=user_id,
    )


# ---------------------------------------------------------------------------
# Scheduler status
# ---------------------------------------------------------------------------

@router.get("/scheduler/status", response_model=SchedulerStatus)
async def get_scheduler_status():
    return SchedulerStatus(**SCHEDULER_STATE)


# ---------------------------------------------------------------------------
# Cron preview — pure utility for UI
# ---------------------------------------------------------------------------

@router.get("/cron/preview")
async def preview_cron(
    expression: str = Query(..., description="5-field cron expression"),
    count: int = Query(5, ge=1, le=20),
):
    if not is_valid_cron(expression):
        raise HTTPException(status_code=400, detail="Gecersiz cron ifadesi.")
    fires: list[datetime] = []
    cursor: Optional[datetime] = None
    for _ in range(count):
        nxt = compute_next_run(expression, now=cursor)
        if nxt is None:
            break
        fires.append(nxt)
        cursor = nxt
    return {"expression": expression, "next_runs": [f.isoformat() for f in fires]}
