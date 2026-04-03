"""
Execution Contract — RetryHistory Schema (Phase 1.1)

Retry is a first-class event, not just a counter increment.
Each retry attempt gets its own RetryHistory record so that admins can
trace exactly what failed, when, why, and how it resolved.

Visibility notes:
  - RetryHistory is [admin-visible].
  - VisibilityRule target_key: "panel:job_detail:retry_history"
  - Users may see a simplified "N retries" summary via a separate
    visibility-controlled field, not the full history.

Settings integration notes (future Settings Registry keys):
  - execution.max_job_retries      : ceiling for job-level retries
  - execution.max_step_retries     : ceiling for step-level retries
  - execution.retry_backoff_seconds: base delay between retries
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.contracts.enums import RetryDisposition


class RetryHistory(BaseModel):
    """
    Authoritative schema for a single retry event on a job or step.

    Level:
        JOB-level retries restart the entire job from the beginning (or
        from the first failed step, depending on retry policy).
        STEP-level retries re-execute only the affected step.

    triggered_by:
        "system" — automatic retry initiated by the executor (e.g. transient
                   provider failure, timeout).
        "user"   — manual retry initiated via the Job Detail actions panel.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Stable UUID for this retry record.")
    job_id: str = Field(..., description="Parent job ID.")

    # Retry scope
    level: str = Field(
        ...,
        description="'job' or 'step' — what was retried.",
    )
    attempt_number: int = Field(
        ...,
        description=(
            "1-based retry count for this job/step. "
            "attempt_number=1 means this is the first retry (second total attempt)."
        )
    )

    # Trigger
    triggered_by: str = Field(
        ...,
        description="'system' (automatic) or 'user' (manual action)."
    )
    reason: Optional[str] = Field(
        default=None,
        description=(
            "Human-readable reason for the retry. "
            "For system retries: the error that triggered it. "
            "For user retries: optional note entered by the user/admin."
        )
    )

    # State transition context
    from_status: str = Field(
        ...,
        description="Job/step status before the retry was initiated."
    )
    to_status: str = Field(
        ...,
        description="Job/step status after the retry was initiated (typically 'retrying')."
    )
    affected_step_key: Optional[str] = Field(
        default=None,
        description=(
            "For step-level retries: the step_key that was retried. "
            "Null for job-level retries."
        )
    )

    # Resolution
    disposition: Optional[RetryDisposition] = Field(
        default=None,
        description=(
            "How this retry resolved. Null while retry is still in progress. "
            "[admin-visible]"
        )
    )

    created_at: datetime = Field(
        ...,
        description="When the retry was initiated."
    )
    resolved_at: Optional[datetime] = Field(
        default=None,
        description="When the retry concluded (succeeded, failed, or abandoned)."
    )
