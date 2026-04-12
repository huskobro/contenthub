"""
Full-Auto Mode service — project-level auto-run + cron (v1).

Pipeline is already sequential (PipelineRunner). Full-Auto layer's job is:
  1. Build input from project defaults (skip wizard).
  2. Enforce guard rails (concurrency, daily quota, required fields, module
     allowlist, global kill switch, review gate precedence).
  3. Dispatch the job via existing standard_video.start_production.
  4. Stamp run_mode / trigger_source / scheduled_run_id / auto_advanced on the
     Job row.
  5. Provide a post-completion hook: if automation_publish_policy demands
     non-draft AND review gate is clear AND policy says publish_now, create a
     publish record in draft state (v1 ALWAYS draft; no auto-publish in first
     phase per spec).
  6. Never touch an existing AutomationPolicy or the review_status state
     machine directly.

The module currently hard-limits to ``standard_video`` as MVP.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple, TYPE_CHECKING

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.db.models import (
    ContentProject,
    Job,
    StandardVideo,
    Template,
    ChannelProfile,
    StyleBlueprint,
)
from app.full_auto.schemas import (
    FullAutoTriggerRequest,
    FullAutoTriggerResponse,
    GuardCheckResult,
)
from app.settings.settings_resolver import resolve

if TYPE_CHECKING:
    from app.jobs.dispatcher import JobDispatcher


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants — v1 module allowlist
# ---------------------------------------------------------------------------

SUPPORTED_MODULES_V1 = ("standard_video",)


# ---------------------------------------------------------------------------
# Global-config helpers
# ---------------------------------------------------------------------------

async def get_global_automation_config(db: AsyncSession) -> dict:
    """Resolve all automation.* settings into a plain dict with safe defaults."""
    keys = [
        "automation.full_auto.enabled",
        "automation.full_auto.allowed_modules",
        "automation.full_auto.require_review_gate",
        "automation.full_auto.default_publish_policy",
        "automation.full_auto.max_concurrent_per_user",
        "automation.full_auto.max_concurrent_per_project",
        "automation.full_auto.max_daily_runs_per_project",
        "automation.full_auto.require_template",
        "automation.full_auto.require_channel",
        "automation.full_auto.require_blueprint",
        "automation.scheduler.enabled",
        "automation.scheduler.poll_interval_seconds",
        "automation.scheduler.default_timezone",
    ]
    out: dict = {}
    for k in keys:
        out[k] = await resolve(k, db)
    return out


# ---------------------------------------------------------------------------
# Guard evaluation
# ---------------------------------------------------------------------------

async def evaluate_guards(
    db: AsyncSession,
    project: ContentProject,
    *,
    global_config: Optional[dict] = None,
) -> GuardCheckResult:
    """Run all pre-flight guards for a full-auto request.

    Does NOT mutate anything. Returns a structured result so both the HTTP
    layer and the scheduler can use the same code path.
    """
    violations: list[str] = []
    warnings: list[str] = []

    if global_config is None:
        global_config = await get_global_automation_config(db)

    # 1. Global kill switch
    if not bool(global_config.get("automation.full_auto.enabled")):
        violations.append(
            "Global tam otomatik mod kapali. Admin ayarlarindan etkinlestirilmeli."
        )

    # 2. Module allowlist
    allowed = global_config.get("automation.full_auto.allowed_modules") or []
    if isinstance(allowed, str):
        try:
            allowed = json.loads(allowed)
        except Exception:
            allowed = [allowed]
    if project.module_type not in allowed:
        violations.append(
            f"Bu projenin modulu ({project.module_type}) tam otomatik icin izinli degil."
        )
    if project.module_type not in SUPPORTED_MODULES_V1:
        violations.append(
            f"Faz 1 yalnizca Standart Video modulunu destekler. "
            f"Bu projenin modulu ({project.module_type}) henuz otomatik calistirilamaz."
        )

    # 3. Per-project toggle
    if not project.automation_enabled:
        violations.append("Proje otomasyonu kapali. Proje ayarlarindan etkinlestirilmeli.")

    # 4. Required fields (policy-driven)
    require_template = bool(global_config.get("automation.full_auto.require_template"))
    require_channel = bool(global_config.get("automation.full_auto.require_channel"))
    require_blueprint = bool(global_config.get("automation.full_auto.require_blueprint"))

    if require_template and not project.automation_default_template_id:
        violations.append("Varsayilan sablon tanimli degil. Proje ayarlarindan bir sablon secilmeli.")
    if require_channel and not project.channel_profile_id:
        violations.append("Proje icin kanal profili bagli degil. Bir kanal secilmeli.")
    if require_blueprint and not project.automation_default_blueprint_id:
        violations.append("Varsayilan stil rehberi tanimli degil.")

    # 5. Concurrency — per project
    proj_limit = int(global_config.get("automation.full_auto.max_concurrent_per_project") or 1)
    running_for_project = await db.scalar(
        select(func.count(Job.id)).where(
            and_(
                Job.content_project_id == project.id,
                Job.run_mode == "full_auto",
                Job.status.in_(("queued", "running")),
            )
        )
    )
    if (running_for_project or 0) >= proj_limit:
        violations.append(
            f"Bu projede zaten {running_for_project} otomatik is calisiyor (limit: {proj_limit})."
        )

    # 6. Concurrency — per user
    user_limit = int(global_config.get("automation.full_auto.max_concurrent_per_user") or 1)
    running_for_user = await db.scalar(
        select(func.count(Job.id)).where(
            and_(
                Job.owner_id == project.user_id,
                Job.run_mode == "full_auto",
                Job.status.in_(("queued", "running")),
            )
        )
    )
    if (running_for_user or 0) >= user_limit:
        violations.append(
            f"Kullanicinin toplam {running_for_user} otomatik isi calisiyor (limit: {user_limit})."
        )

    # 7. Daily quota
    global_daily = int(global_config.get("automation.full_auto.max_daily_runs_per_project") or 5)
    project_daily = project.automation_max_runs_per_day
    effective_daily = min(global_daily, project_daily) if project_daily else global_daily
    today_str = _today_str()
    if project.automation_runs_today_date != today_str:
        # Day rolled over — no quota consumed yet; warn only
        pass
    else:
        if project.automation_runs_today >= effective_daily:
            violations.append(
                f"Bugun {project.automation_runs_today} is calistirildi, "
                f"gunluk limit ({effective_daily}) doldu."
            )

    # 8. Optional integrity checks — warnings
    if project.automation_publish_policy == "publish_now":
        warnings.append(
            "Faz 1: \"Hemen Yayinla\" secili olsa bile uretim sonucu taslak olarak kalir. "
            "Otomatik yayin ileri fazda aktif olacaktir."
        )

    return GuardCheckResult(
        allowed=len(violations) == 0,
        violations=violations,
        warnings=warnings,
    )


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Quota accounting helpers
# ---------------------------------------------------------------------------

def _bump_runs_today(project: ContentProject) -> None:
    today = _today_str()
    if project.automation_runs_today_date != today:
        project.automation_runs_today_date = today
        project.automation_runs_today = 0
    project.automation_runs_today += 1
    project.automation_last_run_at = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Trigger — manual (click-to-run) + scheduled (same path)
# ---------------------------------------------------------------------------

async def trigger_full_auto(
    db: AsyncSession,
    project_id: str,
    dispatcher: "JobDispatcher",
    session_factory,
    *,
    payload: Optional[FullAutoTriggerRequest] = None,
    trigger_source: str = "manual",
    scheduled_run_id: Optional[str] = None,
    actor_id: Optional[str] = None,
) -> FullAutoTriggerResponse:
    """
    Attempt to run a project in full-auto mode.

    trigger_source: 'manual' | 'scheduled' | 'api'
    scheduled_run_id: unique-per-tick ID when called from the scheduler, used
                     as a dedupe key so a tick cannot double-fire the same
                     (project, fire_time).

    Returns a structured FullAutoTriggerResponse (accepted + reason/job_id).
    Never raises on guard failures — those are returned as accepted=False.
    """
    project = await db.get(ContentProject, project_id)
    if project is None:
        return FullAutoTriggerResponse(
            accepted=False,
            reason=f"Proje bulunamadi: {project_id}",
            project_id=project_id,
        )

    # Dedupe scheduled re-entries.
    if scheduled_run_id:
        existing = await db.scalar(
            select(func.count(Job.id)).where(Job.scheduled_run_id == scheduled_run_id)
        )
        if existing and existing > 0:
            logger.debug(
                "full_auto: scheduled_run_id=%s already has %s job(s) — skipping duplicate fire",
                scheduled_run_id, existing,
            )
            return FullAutoTriggerResponse(
                accepted=False,
                reason="Bu zaman dilimi icin bu proje zaten calistirilmis (duplicate fire).",
                project_id=project_id,
                scheduled_run_id=scheduled_run_id,
            )

    # Guard evaluation
    guards = await evaluate_guards(db, project)
    if not guards.allowed:
        await write_audit_log(
            db,
            action="full_auto.trigger.rejected",
            entity_type="content_project",
            entity_id=project_id,
            actor_type="scheduler" if trigger_source == "scheduled" else "user",
            actor_id=actor_id,
            details={
                "trigger_source": trigger_source,
                "scheduled_run_id": scheduled_run_id,
                "violations": guards.violations,
                "warnings": guards.warnings,
            },
        )
        await db.commit()
        return FullAutoTriggerResponse(
            accepted=False,
            reason="; ".join(guards.violations),
            project_id=project_id,
            scheduled_run_id=scheduled_run_id,
        )

    # --- Build input from project defaults (skip wizard) ------------------
    # v1: only standard_video
    if project.module_type != "standard_video":
        return FullAutoTriggerResponse(
            accepted=False,
            reason=f"v1: only standard_video supported, got {project.module_type}",
            project_id=project_id,
        )

    # Resolve topic / title / brief — per-trigger overrides first, then project
    topic = None
    title = project.title
    brief = project.description
    if payload is not None:
        topic = payload.topic or topic
        title = payload.title or title
        brief = payload.brief or brief
    if not topic:
        # Fallback: use project title as topic
        topic = title or "Tam otomatik icerik"

    # Create the StandardVideo row backing this run
    from app.modules.standard_video.schemas import StandardVideoCreate
    from app.modules.standard_video.service import (
        create_standard_video,
        start_production,
    )

    sv_payload = StandardVideoCreate(
        topic=topic,
        title=title,
        brief=brief,
        template_id=project.automation_default_template_id,
        style_blueprint_id=project.automation_default_blueprint_id,
        content_project_id=project.id,
        channel_profile_id=project.channel_profile_id,
    )
    video = await create_standard_video(db, sv_payload)

    # start_production creates + dispatches the Job; we then stamp run_mode.
    result = await start_production(
        db,
        video_id=video.id,
        dispatcher=dispatcher,
        session_factory=session_factory,
        owner_id=project.user_id,
    )
    job_id = result.get("job_id")

    # Stamp run_mode + trigger_source + scheduled_run_id on the created Job
    if job_id:
        job = await db.get(Job, job_id)
        if job is not None:
            job.run_mode = "full_auto"
            job.trigger_source = trigger_source
            job.scheduled_run_id = scheduled_run_id
            job.auto_advanced = True

    # Update project quota + timestamps
    _bump_runs_today(project)

    await write_audit_log(
        db,
        action="full_auto.trigger.accepted",
        entity_type="content_project",
        entity_id=project_id,
        actor_type="scheduler" if trigger_source == "scheduled" else "user",
        actor_id=actor_id,
        details={
            "trigger_source": trigger_source,
            "scheduled_run_id": scheduled_run_id,
            "job_id": job_id,
            "video_id": video.id,
            "runs_today": project.automation_runs_today,
            "warnings": guards.warnings,
        },
    )
    await db.commit()

    return FullAutoTriggerResponse(
        accepted=True,
        project_id=project_id,
        job_id=job_id,
        run_mode="full_auto",
        trigger_source=trigger_source,
        scheduled_run_id=scheduled_run_id,
    )


# ---------------------------------------------------------------------------
# Post-completion hook — review gate + publish policy
# ---------------------------------------------------------------------------

async def on_job_completed(
    db: AsyncSession,
    job: Job,
) -> None:
    """Called by pipeline completion path for any job.

    Only reacts when job.run_mode == 'full_auto'. In v1:
      - ALWAYS leaves the content in draft (first phase spec).
      - Writes an audit log line so operators can see the policy resolution.
      - Never auto-publishes, regardless of automation_publish_policy, because
        review_state / security / state machine precedence rules the first
        phase.

    Intended to be invoked from a safe caller that manages its own tx.
    """
    if job.run_mode != "full_auto":
        return
    if job.content_project_id is None:
        return

    project = await db.get(ContentProject, job.content_project_id)
    if project is None:
        return

    publish_policy = project.automation_publish_policy or "draft"
    requires_review = bool(project.automation_require_review_gate)

    await write_audit_log(
        db,
        action="full_auto.job.completed",
        entity_type="job",
        entity_id=job.id,
        actor_type="system",
        details={
            "project_id": project.id,
            "publish_policy": publish_policy,
            "requires_review": requires_review,
            "phase1_note": "publish gate bypass kapali; sonuç her zaman draft olarak birakilir",
        },
    )
    # No commit here — caller owns the transaction.


# ---------------------------------------------------------------------------
# Project config read/write helpers (used by router)
# ---------------------------------------------------------------------------

async def apply_config_update(
    db: AsyncSession,
    project: ContentProject,
    updates: dict,
    actor_id: Optional[str] = None,
) -> ContentProject:
    """Apply a validated PATCH payload to the project.

    Writes an audit log line and commits.
    """
    allowed_fields = {
        "automation_enabled",
        "automation_run_mode",
        "automation_schedule_enabled",
        "automation_cron_expression",
        "automation_timezone",
        "automation_default_template_id",
        "automation_default_blueprint_id",
        "automation_require_review_gate",
        "automation_publish_policy",
        "automation_fallback_on_error",
        "automation_max_runs_per_day",
    }
    changed: dict = {}
    for key, val in updates.items():
        if key in allowed_fields and val is not None:
            old = getattr(project, key)
            if old != val:
                setattr(project, key, val)
                changed[key] = {"from": old, "to": val}

    if changed:
        await write_audit_log(
            db,
            action="full_auto.config.updated",
            entity_type="content_project",
            entity_id=project.id,
            actor_type="user",
            actor_id=actor_id,
            details={"changes": changed},
        )
    await db.commit()
    await db.refresh(project)
    return project
