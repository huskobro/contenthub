"""Pydantic schemas for Full-Auto Mode v1."""

from datetime import datetime
from typing import Optional, List, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

RUN_MODE_VALUES = ("manual", "assisted", "full_auto")
PUBLISH_POLICY_VALUES = ("draft", "schedule", "publish_now")
FALLBACK_ON_ERROR_VALUES = ("pause", "retry_once", "stop")
TRIGGER_SOURCE_VALUES = ("manual", "scheduled", "api")


# ---------------------------------------------------------------------------
# Project automation config — CRUD payload
# ---------------------------------------------------------------------------

class ProjectAutomationConfig(BaseModel):
    """Full-Auto configuration snapshot for a single ContentProject."""

    automation_enabled: bool = False
    automation_run_mode: Literal["manual", "assisted", "full_auto"] = "manual"
    automation_schedule_enabled: bool = False
    automation_cron_expression: Optional[str] = None
    automation_timezone: str = "UTC"
    automation_default_template_id: Optional[str] = None
    automation_default_blueprint_id: Optional[str] = None
    automation_require_review_gate: bool = True
    automation_publish_policy: Literal["draft", "schedule", "publish_now"] = "draft"
    automation_fallback_on_error: Literal["pause", "retry_once", "stop"] = "pause"
    automation_max_runs_per_day: Optional[int] = Field(default=None, ge=0)

    # Read-only state tracking — returned by GET but ignored on PATCH.
    automation_last_run_at: Optional[datetime] = None
    automation_next_run_at: Optional[datetime] = None
    automation_runs_today: int = 0
    automation_runs_today_date: Optional[str] = None


class ProjectAutomationConfigUpdate(BaseModel):
    """PATCH payload — all optional. Only explicit fields are updated."""

    automation_enabled: Optional[bool] = None
    automation_run_mode: Optional[Literal["manual", "assisted", "full_auto"]] = None
    automation_schedule_enabled: Optional[bool] = None
    automation_cron_expression: Optional[str] = None
    automation_timezone: Optional[str] = None
    automation_default_template_id: Optional[str] = None
    automation_default_blueprint_id: Optional[str] = None
    automation_require_review_gate: Optional[bool] = None
    automation_publish_policy: Optional[Literal["draft", "schedule", "publish_now"]] = None
    automation_fallback_on_error: Optional[Literal["pause", "retry_once", "stop"]] = None
    automation_max_runs_per_day: Optional[int] = Field(default=None, ge=0)


# ---------------------------------------------------------------------------
# Trigger payload (manual full-auto click)
# ---------------------------------------------------------------------------

class FullAutoTriggerRequest(BaseModel):
    """Manual (click-to-run) full-auto trigger payload."""

    topic: Optional[str] = None
    title: Optional[str] = None
    brief: Optional[str] = None
    note: Optional[str] = None  # operator-facing note recorded in audit log


class FullAutoTriggerResponse(BaseModel):
    """Result of a trigger attempt."""

    accepted: bool
    reason: Optional[str] = None
    project_id: str
    job_id: Optional[str] = None
    run_mode: Optional[str] = None
    trigger_source: Optional[str] = None
    scheduled_run_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Guard evaluation
# ---------------------------------------------------------------------------

class GuardCheckResult(BaseModel):
    """Structured explanation of why a full-auto run was or was not allowed."""

    allowed: bool
    violations: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Scheduler status
# ---------------------------------------------------------------------------

class SchedulerStatus(BaseModel):
    """Public-facing scheduler status for ops / admin dashboards."""

    enabled: bool
    poll_interval_seconds: int
    last_tick_at: Optional[datetime] = None
    last_tick_ok: Optional[bool] = None
    last_tick_error: Optional[str] = None
    pending_project_count: int = 0
    next_candidate_project_id: Optional[str] = None
    next_candidate_run_at: Optional[datetime] = None
