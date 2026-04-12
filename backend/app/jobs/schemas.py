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
    provider_trace_json: Optional[str] = None
    log_text: Optional[str] = None
    elapsed_seconds: Optional[float] = None
    last_error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    updated_at: datetime

    # Computed timing fields — not stored in the ORM model.
    # elapsed_seconds_live: live elapsed seconds (None if step not started or already finished)
    # eta_seconds: estimated remaining seconds for this step (set by timing_service)
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
    input_data_json: Optional[str] = None
    workspace_path: Optional[str] = None
    is_test_data: Optional[bool] = None
    channel_profile_id: Optional[str] = None  # Faz 5a
    content_project_id: Optional[str] = None  # Faz 5a


# Desteklenen dil kodları — wizard/API yoluyla job yaratılırken kullanılır
_SUPPORTED_LANGUAGES = {"tr", "en", "de", "fr", "es", "ar", "ja", "zh", "ru", "pt"}


class JobCreateRequest(BaseModel):
    """
    Wizard veya API üzerinden job yaratmak için kullanıcıya açık istek şeması (M2-C6).

    Bu şema router'ın HTTP katmanında kullanılır; InputNormalizer ile valide edilir,
    ardından service.create_job için JobCreate'e dönüştürülür.

    Alanlar:
        module_id        : Hedef modülün kimliği (örn. 'standard_video').
        topic            : Video konusu — senaryo üretiminin ana girdisi.
        language         : ISO 639-1 dil kodu; desteklenen kodlardan biri olmalı.
        duration_seconds : Hedef video süresi saniye cinsinden.
    """

    module_id: str
    topic: str
    language: str = "tr"
    duration_seconds: int = 60

    @classmethod
    def __get_validators__(cls):
        yield cls._validate

    @classmethod
    def _validate(cls, v):
        return v

    def model_post_init(self, __context) -> None:
        """Dil kodunu doğrula — desteklenmiyorsa ValueError fırlat."""
        if self.language not in _SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Desteklenmeyen dil kodu: {self.language!r}. "
                f"Geçerli kodlar: {sorted(_SUPPORTED_LANGUAGES)}"
            )


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
    is_test_data: bool = False
    channel_profile_id: Optional[str] = None  # Faz 5a
    content_project_id: Optional[str] = None  # Faz 5a
    trigger_source: Optional[str] = None  # Faz 2
    run_mode: Optional[str] = None  # Full-Auto v1
    auto_advanced: bool = False  # Full-Auto v1
    scheduled_run_id: Optional[str] = None  # Full-Auto v1
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
            live = _elapsed_seconds(self.started_at)
            self.elapsed_seconds = live
            # Populate elapsed_total_seconds for active jobs so the UI
            # always has a value to display (ORM field stays null until terminal).
            if self.elapsed_total_seconds is None:
                self.elapsed_total_seconds = live
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
