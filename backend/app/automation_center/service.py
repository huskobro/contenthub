"""
Automation Center — aggregate service.

What this layer does:
  - Reads ContentProject + AutomationPolicy and assembles the canonical
    node graph for the project's module_type.
  - Mutates flow-level config (project automation_* fields) and per-node
    config (stored as JSON inside ContentProject.latest_output_ref's
    sibling — see _read_node_overrides / _write_node_overrides; we use
    ContentProject.description? No — we use the dedicated AutomationPolicy
    publish_windows_json/platform_rules_json fields for now and keep node
    config in `platform_rules_json` under a known top-level key.)
  - Evaluates whether the flow can run (preflight).
  - Submits run-now jobs (delegates to app.jobs.service.create_job).
  - Tests a single node (dry-run).

Where node overrides are persisted:
  We keep them inside `AutomationPolicy.platform_rules_json` under the
  reserved key `"automation_center.nodes"` so we don't add a schema
  migration for the very first cut. This is a deliberate, narrow use of
  an existing JSON column; the audit log records every change so we
  retain the operational truth.
  When AutomationPolicy is missing for the project's channel, we
  auto-create one (idempotent) so the canvas always has a place to
  persist node overrides.

Ownership: caller (router) enforces ownership before this service runs.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.auth.ownership import UserContext
from app.automation_center.node_catalog import (
    NodeSpec,
    get_node_catalog,
    list_node_specs,
)
from app.automation_center.schemas import (
    AutomationCenterResponse,
    AutomationEdge,
    AutomationFlowConfig,
    AutomationFlowPatch,
    AutomationNode,
    AutomationNodePatch,
    EvaluateResponse,
    NodeBadge,
    NodeTestRequest,
    NodeTestResponse,
    ProjectSummary,
    RunNowRequest,
    RunNowResponse,
)
from app.db.models import (
    AutomationPolicy,
    ChannelProfile,
    ContentProject,
    Job,
)

logger = logging.getLogger(__name__)


_NODE_OVERRIDES_KEY = "automation_center.nodes"


# ---------------------------------------------------------------------------
# Internal helpers — JSON storage on AutomationPolicy.platform_rules_json
# ---------------------------------------------------------------------------


def _read_overrides(policy: AutomationPolicy) -> Dict[str, Any]:
    raw = policy.platform_rules_json
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    overrides = data.get(_NODE_OVERRIDES_KEY)
    if not isinstance(overrides, dict):
        return {}
    return overrides


def _write_overrides(policy: AutomationPolicy, overrides: Dict[str, Any]) -> None:
    raw = policy.platform_rules_json
    container: Dict[str, Any] = {}
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                container = parsed
        except (TypeError, ValueError):
            pass
    container[_NODE_OVERRIDES_KEY] = overrides
    policy.platform_rules_json = json.dumps(container, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Resolve / build helpers
# ---------------------------------------------------------------------------


async def _get_or_create_policy(
    db: AsyncSession, channel_profile_id: str, owner_user_id: str
) -> AutomationPolicy:
    q = select(AutomationPolicy).where(
        AutomationPolicy.channel_profile_id == channel_profile_id
    )
    existing = (await db.execute(q)).scalar_one_or_none()
    if existing is not None:
        return existing
    policy = AutomationPolicy(
        owner_user_id=owner_user_id,
        channel_profile_id=channel_profile_id,
        name="Automation Center Politikasi",
        is_enabled=False,
    )
    db.add(policy)
    await db.flush()
    return policy


def _project_flow(project: ContentProject) -> AutomationFlowConfig:
    return AutomationFlowConfig(
        run_mode=project.automation_run_mode or "manual",  # type: ignore[arg-type]
        schedule_enabled=project.automation_schedule_enabled,
        cron_expression=project.automation_cron_expression,
        timezone=project.automation_timezone or "UTC",
        require_review_gate=project.automation_require_review_gate,
        publish_policy=project.automation_publish_policy or "draft",  # type: ignore[arg-type]
        fallback_on_error=project.automation_fallback_on_error or "pause",  # type: ignore[arg-type]
        max_runs_per_day=project.automation_max_runs_per_day,
        default_template_id=project.automation_default_template_id,
        default_blueprint_id=project.automation_default_blueprint_id,
    )


def _resolve_node_status(
    spec: NodeSpec, override: Dict[str, Any], project: ContentProject
) -> Tuple[str, List[str]]:
    """Server-side status derivation. The client never writes status."""
    issues: List[str] = []
    # Disabled overrides everything except 'complete'.
    if override.get("operation_mode") == "disabled":
        return "disabled", issues
    # Required-config check.
    for key, label in spec.required_config:
        if not override.get("config", {}).get(key):
            issues.append(f"{spec.title}: {label} eksik")
    if issues:
        # If all required are missing and node sits on the critical path,
        # it's a hard blocker; else a warning.
        return ("blocked" if spec.critical else "warning", issues)
    return "ready", issues


def _build_node(
    spec: NodeSpec, override: Dict[str, Any], project: ContentProject
) -> AutomationNode:
    op_mode = override.get("operation_mode") or spec.default_operation_mode
    config = override.get("config") or {}
    status, issues = _resolve_node_status(spec, override, project)
    badges = [
        NodeBadge(
            label=_status_label(status),
            tone=_status_tone(status),
            detail="; ".join(issues) if issues else None,
        ),
        NodeBadge(
            label=_mode_label(op_mode),
            tone=_mode_tone(op_mode),
        ),
    ]
    return AutomationNode(
        id=spec.id,
        title=spec.title,
        description=spec.description,
        scope=spec.scope,
        operation_mode=op_mode,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        badges=badges,
        config=config,
        last_run_at=None,
        last_run_outcome=None,
    )


def _status_label(status: str) -> str:
    return {
        "ready": "Hazir",
        "warning": "Uyari",
        "blocked": "Engelli",
        "disabled": "Pasif",
        "complete": "Tamamlandi",
    }.get(status, status)


def _status_tone(status: str) -> str:
    return {
        "ready": "ok",
        "warning": "warn",
        "blocked": "bad",
        "disabled": "neutral",
        "complete": "ok",
    }.get(status, "neutral")


def _mode_label(mode: str) -> str:
    return {
        "manual": "Manuel",
        "ai_assist": "AI Destekli",
        "automatic": "Otomatik",
    }.get(mode, mode)


def _mode_tone(mode: str) -> str:
    return {
        "manual": "neutral",
        "ai_assist": "accent",
        "automatic": "ok",
    }.get(mode, "neutral")


# ---------------------------------------------------------------------------
# Aggregate GET
# ---------------------------------------------------------------------------


def _build_response(
    project: ContentProject,
    policy: AutomationPolicy,
    snapshot_locked: bool,
) -> AutomationCenterResponse:
    overrides = _read_overrides(policy)
    specs = list_node_specs(project.module_type)
    nodes = [_build_node(spec, overrides.get(spec.id, {}), project) for spec in specs]
    edges: List[AutomationEdge] = []
    for prev, curr in zip(specs, specs[1:]):
        edges.append(AutomationEdge(source=prev.id, target=curr.id))

    blockers = [
        b
        for n in nodes
        if n.status == "blocked"
        for b in (n.badges[0].detail.split("; ") if n.badges and n.badges[0].detail else [])
    ]
    warnings = [
        w
        for n in nodes
        if n.status == "warning"
        for w in (n.badges[0].detail.split("; ") if n.badges and n.badges[0].detail else [])
    ]
    health: Dict[str, Any] = {
        "blockers": blockers,
        "warnings": warnings,
        "ready_count": sum(1 for n in nodes if n.status == "ready"),
        "node_count": len(nodes),
    }

    return AutomationCenterResponse(
        project=ProjectSummary(
            id=project.id,
            title=project.title,
            module_type=project.module_type,
            user_id=project.user_id,
            channel_profile_id=project.channel_profile_id,
            primary_platform=project.primary_platform,
            content_status=project.content_status,
            publish_status=project.publish_status,
        ),
        flow=_project_flow(project),
        nodes=nodes,
        edges=edges,
        health=health,
        last_evaluated_at=datetime.now(timezone.utc),
        snapshot_locked=snapshot_locked,
    )


async def _detect_snapshot_lock(db: AsyncSession, project_id: str) -> bool:
    """A project's flow is snapshot-locked when there's an active job."""
    q = (
        select(Job)
        .where(
            Job.content_project_id == project_id,
            Job.status.in_(["queued", "running", "retrying"]),
        )
        .limit(1)
    )
    return (await db.execute(q)).scalar_one_or_none() is not None


async def get_automation_center(
    db: AsyncSession, *, project: ContentProject
) -> AutomationCenterResponse:
    policy = await _get_or_create_policy(
        db, project.channel_profile_id, project.user_id
    )
    snapshot_locked = await _detect_snapshot_lock(db, project.id)
    # Ensure any auto-created policy is committed so subsequent saves
    # have something to reference.
    await db.commit()
    await db.refresh(policy)
    await db.refresh(project)
    return _build_response(project, policy, snapshot_locked)


# ---------------------------------------------------------------------------
# Patches
# ---------------------------------------------------------------------------


_FLOW_FIELD_MAP = {
    "run_mode": "automation_run_mode",
    "schedule_enabled": "automation_schedule_enabled",
    "cron_expression": "automation_cron_expression",
    "timezone": "automation_timezone",
    "require_review_gate": "automation_require_review_gate",
    "publish_policy": "automation_publish_policy",
    "fallback_on_error": "automation_fallback_on_error",
    "max_runs_per_day": "automation_max_runs_per_day",
    "default_template_id": "automation_default_template_id",
    "default_blueprint_id": "automation_default_blueprint_id",
}


async def patch_flow(
    db: AsyncSession,
    *,
    ctx: UserContext,
    project: ContentProject,
    payload: AutomationFlowPatch,
) -> AutomationCenterResponse:
    locked = await _detect_snapshot_lock(db, project.id)
    if locked:
        raise PermissionError(
            "Aktif bir is calisirken flow konfigurasyonu degistirilemez (snapshot lock)."
        )

    changed: List[str] = []
    for src, dst in _FLOW_FIELD_MAP.items():
        new_val = getattr(payload, src)
        if new_val is not None and new_val != getattr(project, dst):
            setattr(project, dst, new_val)
            changed.append(src)

    # Coherence rule: schedule_enabled requires cron_expression.
    if (
        project.automation_schedule_enabled
        and not project.automation_cron_expression
    ):
        raise ValueError("Zamanlama aciksa cron_expression zorunludur.")

    if changed:
        # Auto-toggle automation_enabled based on run_mode for honesty:
        # manual mode means automation is off.
        project.automation_enabled = project.automation_run_mode != "manual"
        await write_audit_log(
            db,
            action="automation_center.flow.save",
            entity_type="ContentProject",
            entity_id=project.id,
            actor_type="user",
            actor_id=ctx.user_id,
            details={"fields": changed},
        )

    policy = await _get_or_create_policy(
        db, project.channel_profile_id, project.user_id
    )
    snapshot_locked = await _detect_snapshot_lock(db, project.id)
    await db.commit()
    await db.refresh(project)
    await db.refresh(policy)
    return _build_response(project, policy, snapshot_locked)


async def patch_node(
    db: AsyncSession,
    *,
    ctx: UserContext,
    project: ContentProject,
    node_id: str,
    payload: AutomationNodePatch,
) -> AutomationCenterResponse:
    catalog = get_node_catalog(project.module_type)
    if node_id not in catalog:
        raise ValueError(f"Bilinmeyen node: {node_id}")

    locked = await _detect_snapshot_lock(db, project.id)
    if locked:
        raise PermissionError(
            "Aktif bir is calisirken node konfigurasyonu degistirilemez (snapshot lock)."
        )

    policy = await _get_or_create_policy(
        db, project.channel_profile_id, project.user_id
    )
    overrides = _read_overrides(policy)
    node_override = dict(overrides.get(node_id, {}))

    diff: List[str] = []
    if payload.operation_mode is not None and payload.operation_mode != node_override.get("operation_mode"):
        node_override["operation_mode"] = payload.operation_mode
        diff.append("operation_mode")
    if payload.config is not None:
        # Replace config wholesale — keeps writes idempotent and easy to audit.
        if payload.config != node_override.get("config", {}):
            node_override["config"] = payload.config
            diff.append("config")

    overrides[node_id] = node_override
    _write_overrides(policy, overrides)

    if diff:
        await write_audit_log(
            db,
            action="automation_center.node.save",
            entity_type="AutomationPolicy",
            entity_id=policy.id,
            actor_type="user",
            actor_id=ctx.user_id,
            details={
                "project_id": project.id,
                "node_id": node_id,
                "fields": diff,
            },
        )

    snapshot_locked = await _detect_snapshot_lock(db, project.id)
    await db.commit()
    await db.refresh(policy)
    await db.refresh(project)
    return _build_response(project, policy, snapshot_locked)


# ---------------------------------------------------------------------------
# Evaluate / Run / Test
# ---------------------------------------------------------------------------


def _next_cron_estimate(cron: Optional[str], tz: str) -> Optional[datetime]:
    """Cheap estimate; we don't fully parse cron — return now+30m as a hint
    so the UI can show 'next run ~ ...'. Real schedule lives in the
    scheduler; this is just an honest approximation."""
    if not cron:
        return None
    return datetime.now(timezone.utc) + timedelta(minutes=30)


async def evaluate(
    db: AsyncSession, *, project: ContentProject
) -> EvaluateResponse:
    policy = await _get_or_create_policy(
        db, project.channel_profile_id, project.user_id
    )
    overrides = _read_overrides(policy)
    specs = list_node_specs(project.module_type)
    blockers: List[str] = []
    warnings: List[str] = []
    for spec in specs:
        status, issues = _resolve_node_status(spec, overrides.get(spec.id, {}), project)
        if status == "blocked":
            blockers.extend(issues)
        elif status == "warning":
            warnings.extend(issues)

    # Run-mode + schedule coherence.
    if project.automation_schedule_enabled and not project.automation_cron_expression:
        blockers.append("Zamanlama aciksa cron_expression bos olamaz.")
    if project.automation_run_mode == "full_auto" and project.automation_require_review_gate:
        warnings.append(
            "Tam otomatik calisirken inceleme kapisi acik — yayina cikis manuel onaya kalir."
        )

    await db.commit()
    return EvaluateResponse(
        ok=not blockers,
        blockers=blockers,
        warnings=warnings,
        next_run_estimate=_next_cron_estimate(
            project.automation_cron_expression, project.automation_timezone
        ),
    )


async def run_now(
    db: AsyncSession,
    *,
    ctx: UserContext,
    project: ContentProject,
    payload: RunNowRequest,
) -> RunNowResponse:
    """Submit an immediate run. For dry_run we just return the evaluate
    response so the UI gets one consistent shape; for non-dry-run we
    enqueue a real Job via app.jobs.service.create_job.

    `force=True` bypasses the per-day cap but only when ctx is admin —
    enforced here, not on the client.
    """
    eval_result = await evaluate(db, project=project)
    if not eval_result.ok and not payload.force:
        return RunNowResponse(
            ok=False,
            blockers=eval_result.blockers,
            detail="Onkosul karsilanmadi",
        )

    if payload.dry_run:
        return RunNowResponse(
            ok=True,
            detail="Dry-run: is gonderilmedi (onceki kontrol basariyla gecti)",
        )

    # Daily cap (skip if force + admin).
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if project.automation_runs_today_date != today:
        project.automation_runs_today = 0
        project.automation_runs_today_date = today
    cap = project.automation_max_runs_per_day
    if cap is not None and project.automation_runs_today >= cap:
        if not (payload.force and ctx.is_admin):
            return RunNowResponse(
                ok=False,
                detail=f"Gunluk run limiti dolu ({cap}). Admin force ile gecebilir.",
                blockers=[f"Daily cap reached ({cap})"],
            )

    # Submit real job.
    from app.jobs.schemas import JobCreate
    from app.jobs.service import create_job as jobs_create_job

    module_type = project.module_type or "standard_video"
    payload_obj = JobCreate(
        module_type=module_type,
        owner_id=project.user_id,
        channel_profile_id=project.channel_profile_id,
        content_project_id=project.id,
        template_id=project.automation_default_template_id,
    )
    try:
        job = await jobs_create_job(db, payload_obj)
    except Exception as exc:
        logger.exception("Automation Center: run_now job submit failed: %s", exc)
        return RunNowResponse(ok=False, detail=str(exc))

    project.automation_runs_today += 1
    project.automation_last_run_at = datetime.now(timezone.utc)
    project.active_job_id = job.id

    await write_audit_log(
        db,
        action="automation_center.run_now",
        entity_type="ContentProject",
        entity_id=project.id,
        actor_type="user",
        actor_id=ctx.user_id,
        details={"job_id": job.id, "dry_run": False, "force": payload.force},
    )
    await db.commit()
    return RunNowResponse(ok=True, job_id=job.id, detail="Is kuyruga alindi")


async def test_node(
    db: AsyncSession,
    *,
    ctx: UserContext,
    project: ContentProject,
    node_id: str,
    payload: NodeTestRequest,
) -> NodeTestResponse:
    catalog = get_node_catalog(project.module_type)
    spec = catalog.get(node_id)
    if spec is None:
        return NodeTestResponse(
            ok=False, node_id=node_id, issues=[f"Bilinmeyen node: {node_id}"]
        )
    policy = await _get_or_create_policy(
        db, project.channel_profile_id, project.user_id
    )
    overrides = _read_overrides(policy)
    status, issues = _resolve_node_status(spec, overrides.get(node_id, {}), project)
    if status in ("blocked", "warning"):
        return NodeTestResponse(
            ok=False,
            node_id=node_id,
            issues=issues,
            output={"would_execute": False},
        )
    # Honest stub output — real exec happens when a job runs.
    output = {
        "would_execute": True,
        "scope": spec.scope,
        "operation_mode": overrides.get(node_id, {}).get(
            "operation_mode", spec.default_operation_mode
        ),
        "sample_payload_received": payload.sample_payload or {},
    }
    await write_audit_log(
        db,
        action="automation_center.node.test",
        entity_type="AutomationPolicy",
        entity_id=policy.id,
        actor_type="user",
        actor_id=ctx.user_id,
        details={"project_id": project.id, "node_id": node_id},
    )
    await db.commit()
    return NodeTestResponse(ok=True, node_id=node_id, output=output)
