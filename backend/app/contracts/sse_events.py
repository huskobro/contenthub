"""
Execution Contract — SSE Event Schemas (Phase 1.1)

Authoritative payload definitions for all Server-Sent Events emitted by
ContentHub's SSE hub (Phase 1.6 implementation).

Rules:
  - The SSEEventType enum in enums.py is the single source of truth for
    event type strings. Do not define event type strings elsewhere.
  - Every event carries a mandatory envelope (SSEEnvelope). Consumers
    must validate the envelope before reading the payload.
  - The frontend TypeScript mirror (frontend/src/types/execution.ts) must
    stay in sync with this file.

Stream routing:
  GLOBAL stream  : receives ALL event types. Consumed by the platform-level
                   SSE connection (e.g. for notification center, manifest
                   invalidation, analytics).
  JOB stream     : receives only events scoped to a specific job_id.
                   Consumed by the Job Detail page's SSE hook.

Frontend React Query / Zustand split:
  - Server truth (jobs, steps, settings, visibility) → invalidate React Query
    cache keys on the relevant events.
  - SSE connection state (connected/disconnected, reconnect count) → Zustand.
  - Do NOT mirror server truth into Zustand stores.

Visibility notes:
  - manifest:settings_changed and manifest:visibility_changed are platform-
    scoped and visible to all connected clients (admin + user).
  - job:* events that contain provider_trace or retry data should only be
    forwarded to the frontend if the requesting role has visibility access.
    The SSE hub (Phase 1.6) is responsible for field-level filtering.

Implementation status:
  CONTRACTS ONLY — no SSE transport is implemented in Phase 1.1.
  The SSE hub, broadcaster, and frontend SSE client are Phase 1.6 work.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field

from app.contracts.enums import SSEEventType, JobStatus, JobStepStatus, ReviewStateStatus


# ---------------------------------------------------------------------------
# Base envelope — every SSE message wraps one of these
# ---------------------------------------------------------------------------

class SSEEnvelope(BaseModel):
    """
    Outer wrapper for every SSE message.

    The `event` field maps to the SSE protocol's `event:` line.
    The `data` field is the JSON-encoded payload specific to each event type.
    """

    model_config = ConfigDict(from_attributes=True)

    event: SSEEventType = Field(
        ...,
        description="The SSE event type. Maps to the `event:` line in the SSE protocol."
    )
    stream_scope: str = Field(
        ...,
        description=(
            "'global' for platform-wide events, or the job_id for job-scoped events. "
            "Frontend uses this to route the event to the correct consumer."
        )
    )
    emitted_at: datetime = Field(
        ...,
        description="Server-side timestamp when this event was emitted."
    )


# ---------------------------------------------------------------------------
# Job-scoped event payloads
# ---------------------------------------------------------------------------

class JobStatusChangedPayload(BaseModel):
    """Payload for SSEEventType.JOB_STATUS_CHANGED."""

    model_config = ConfigDict(from_attributes=True)

    job_id: str
    previous_status: JobStatus
    new_status: JobStatus
    current_step_key: Optional[str] = Field(
        default=None,
        description="The active step key after the transition, if any."
    )
    elapsed_total_seconds: Optional[float] = None
    estimated_remaining_seconds: Optional[float] = None
    last_error: Optional[str] = Field(
        default=None,
        description="Set when new_status is FAILED or CANCELLED."
    )

    # React Query invalidation hint
    invalidate_keys: list = Field(
        default_factory=lambda: ["jobs", "job_detail"],
        description=(
            "React Query cache keys that consumers should invalidate on receipt. "
            "Informational — enforcement is on the frontend."
        )
    )


class JobStepChangedPayload(BaseModel):
    """Payload for SSEEventType.JOB_STEP_CHANGED."""

    model_config = ConfigDict(from_attributes=True)

    job_id: str
    step_key: str
    step_order: int
    previous_status: JobStepStatus
    new_status: JobStepStatus
    elapsed_seconds: Optional[float] = None
    last_error: Optional[str] = None

    invalidate_keys: list = Field(
        default_factory=lambda: ["job_detail", "job_steps"],
    )


class JobProgressPayload(BaseModel):
    """
    Payload for SSEEventType.JOB_PROGRESS.

    Emitted during active step execution to provide sub-step progress
    (e.g. render progress percentage, TTS character count processed).
    """

    model_config = ConfigDict(from_attributes=True)

    job_id: str
    step_key: str
    percent_complete: Optional[float] = Field(
        default=None,
        description="0–100 float. Null if provider does not report progress."
    )
    progress_label: Optional[str] = Field(
        default=None,
        description="Human-readable progress description (e.g. 'Rendering frame 120/240')."
    )
    elapsed_step_seconds: Optional[float] = None
    estimated_step_remaining_seconds: Optional[float] = None


class JobLogPayload(BaseModel):
    """Payload for SSEEventType.JOB_LOG."""

    model_config = ConfigDict(from_attributes=True)

    job_id: str
    step_key: Optional[str] = Field(
        default=None,
        description="Null for job-level logs; set for step-level logs."
    )
    level: str = Field(
        default="info",
        description="Log level: 'debug', 'info', 'warning', 'error'."
    )
    message: str
    emitted_at: datetime

    # Visibility hint — the SSE hub filters this before sending to non-admins
    admin_only: bool = Field(
        default=False,
        description="True for technical/diagnostic logs that users should not see."
    )


class JobArtifactPayload(BaseModel):
    """Payload for SSEEventType.JOB_ARTIFACT."""

    model_config = ConfigDict(from_attributes=True)

    job_id: str
    step_key: str
    artifact_id: str
    artifact_kind: str       # ArtifactKind value
    artifact_scope: str      # ArtifactScope value
    artifact_durability: str # ArtifactDurability value
    display_name: str
    local_path: str

    invalidate_keys: list = Field(
        default_factory=lambda: ["job_detail", "job_artifacts"],
    )


class JobErrorPayload(BaseModel):
    """
    Payload for SSEEventType.JOB_ERROR.

    Non-fatal error surfaced mid-execution (does not necessarily cause job failure).
    """

    model_config = ConfigDict(from_attributes=True)

    job_id: str
    step_key: Optional[str] = None
    error_code: Optional[str] = None
    message: str
    recoverable: bool = Field(
        default=True,
        description="True if the executor will attempt recovery/retry automatically."
    )


class JobRetryPayload(BaseModel):
    """Payload for SSEEventType.JOB_RETRY."""

    model_config = ConfigDict(from_attributes=True)

    job_id: str
    level: str              # 'job' or 'step'
    attempt_number: int
    triggered_by: str       # 'system' or 'user'
    affected_step_key: Optional[str] = None
    reason: Optional[str] = None

    invalidate_keys: list = Field(
        default_factory=lambda: ["jobs", "job_detail"],
    )


class JobReviewStateChangedPayload(BaseModel):
    """Payload for SSEEventType.JOB_REVIEW_STATE_CHANGED."""

    model_config = ConfigDict(from_attributes=True)

    job_id: str
    previous_status: ReviewStateStatus
    new_status: ReviewStateStatus
    reviewer_display_name: Optional[str] = None
    notes: Optional[str] = None

    invalidate_keys: list = Field(
        default_factory=lambda: ["job_detail", "review_state"],
    )


# ---------------------------------------------------------------------------
# Platform-scoped event payloads
# ---------------------------------------------------------------------------

class ManifestSettingsChangedPayload(BaseModel):
    """
    Payload for SSEEventType.MANIFEST_SETTINGS_CHANGED.

    Emitted when the Settings Registry changes in a way that affects
    client-visible settings. Frontend should re-fetch the settings manifest.

    React Query invalidation:
        Invalidate: ["settings_manifest"]
        If specific keys are listed in changed_keys, consumers may choose to
        invalidate only the affected queries.
    """

    model_config = ConfigDict(from_attributes=True)

    changed_keys: list = Field(
        default_factory=list,
        description=(
            "List of setting keys that changed. Empty list means 'all changed' — "
            "clients should re-fetch the full manifest."
        )
    )
    invalidate_keys: list = Field(
        default_factory=lambda: ["settings_manifest"],
    )


class ManifestVisibilityChangedPayload(BaseModel):
    """
    Payload for SSEEventType.MANIFEST_VISIBILITY_CHANGED.

    Emitted when VisibilityRule records change in a way that affects the
    client's visibility manifest. Frontend should re-fetch visibility rules
    and re-apply them to all controlled surfaces.

    React Query invalidation:
        Invalidate: ["visibility_manifest"]
    """

    model_config = ConfigDict(from_attributes=True)

    affected_targets: list = Field(
        default_factory=list,
        description=(
            "List of target_key values whose rules changed. "
            "Empty list means 'all rules changed'."
        )
    )
    invalidate_keys: list = Field(
        default_factory=lambda: ["visibility_manifest"],
    )


# ---------------------------------------------------------------------------
# Event type → payload class mapping (for runtime dispatch)
# ---------------------------------------------------------------------------
#
# Phase 1.6 SSE hub will use this map to validate and serialize outgoing events.
# Import this dict rather than reconstructing it elsewhere.
#
SSE_PAYLOAD_MAP: Dict[SSEEventType, Any] = {
    SSEEventType.JOB_STATUS_CHANGED: JobStatusChangedPayload,
    SSEEventType.JOB_STEP_CHANGED: JobStepChangedPayload,
    SSEEventType.JOB_PROGRESS: JobProgressPayload,
    SSEEventType.JOB_LOG: JobLogPayload,
    SSEEventType.JOB_ARTIFACT: JobArtifactPayload,
    SSEEventType.JOB_ERROR: JobErrorPayload,
    SSEEventType.JOB_RETRY: JobRetryPayload,
    SSEEventType.JOB_REVIEW_STATE_CHANGED: JobReviewStateChangedPayload,
    SSEEventType.MANIFEST_SETTINGS_CHANGED: ManifestSettingsChangedPayload,
    SSEEventType.MANIFEST_VISIBILITY_CHANGED: ManifestVisibilityChangedPayload,
}
