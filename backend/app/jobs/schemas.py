"""Pydantic schemas for the Job Engine."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, model_validator

from app.jobs.timing import (
    elapsed_seconds as _elapsed_seconds,
    estimate_remaining_seconds as _estimate_remaining,
    step_progress_fraction as _step_fraction,
)


class JobStepResponse(BaseModel):
    id: str
    job_id: str
    step_key: str
    step_order: int
    status: str
    artifact_refs_json: Optional[str] = None
    log_text: Optional[str] = None
    elapsed_seconds: Optional[float] = None
    last_error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    updated_at: datetime

    # Computed timing fields — not stored in the ORM model.
    # elapsed_seconds_live: live elapsed seconds (None if step not started or already finished)
    # eta_seconds: None always for step-level (ETA lives at job level in v1)
    elapsed_seconds_live: Optional[float] = None
    eta_seconds: Optional[float] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _compute_timing(self) -> "JobStepResponse":
        """
        Compute live elapsed time for steps that are actively running.

        For completed/failed/skipped steps elapsed_seconds is already stored
        in the ORM (set by the side-effect in transition_step_status). For
        running steps it is not yet persisted, so we compute it live here.
        """
        if self.status == "running" and self.started_at is not None:
            self.elapsed_seconds_live = _elapsed_seconds(self.started_at)
        elif self.elapsed_seconds is not None:
            # Use the stored value for terminal steps
            self.elapsed_seconds_live = self.elapsed_seconds
        return self


class JobCreate(BaseModel):
    module_type: str
    owner_id: Optional[str] = None
    template_id: Optional[str] = None
    source_context_json: Optional[str] = None
    workspace_path: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    module_type: str
    status: str
    owner_id: Optional[str] = None
    template_id: Optional[str] = None
    source_context_json: Optional[str] = None
    current_step_key: Optional[str] = None
    retry_count: int
    elapsed_total_seconds: Optional[float] = None
    estimated_remaining_seconds: Optional[float] = None
    workspace_path: Optional[str] = None
    last_error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    updated_at: datetime
    steps: list[JobStepResponse] = []

    # Computed timing fields — derived from timing helpers, not stored on Job ORM.
    elapsed_seconds: Optional[float] = None
    eta_seconds: Optional[float] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _compute_timing(self) -> "JobResponse":
        """
        Compute live elapsed_seconds and eta_seconds for the job.

        For active (running/retrying/waiting) jobs, elapsed is computed live
        from started_at. For terminal jobs, elapsed_total_seconds from the ORM
        is used if available.

        ETA is computed from step progress when the job is running.
        """
        active_statuses = {"running", "waiting", "retrying"}

        if self.status in active_statuses and self.started_at is not None:
            self.elapsed_seconds = _elapsed_seconds(self.started_at)
        elif self.elapsed_total_seconds is not None:
            self.elapsed_seconds = self.elapsed_total_seconds

        # ETA: only meaningful while running
        if self.status == "running" and self.elapsed_seconds is not None and self.steps:
            total = len(self.steps)
            completed = sum(1 for s in self.steps if s.status in ("completed", "skipped"))
            fraction = _step_fraction(completed, total)
            remaining = _estimate_remaining(self.elapsed_seconds, fraction)
            self.eta_seconds = remaining

        return self
