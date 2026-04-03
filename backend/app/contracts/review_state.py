"""
Execution Contract — ReviewState Schema (Phase 1.1)

The review gate is a checkpoint between production completion and publishing.
It allows admins or authorized users to approve or reject a job's output
before it is sent to any publish adapter.

Implementation note:
  The review gate executor and review UI panels are Phase 1.7+ work.
  This contract defines the schema so that Job Detail, SSE events,
  and the publish adapter can reference review state consistently
  from Phase 1.1 onward.

Visibility notes:
  - ReviewState is [admin-visible + user-visible where VisibilityRule permits].
  - VisibilityRule target_key candidates:
      "panel:job_detail:review_state"
      "field:review_state:reviewer_id"
      "field:review_state:rejection_reason"
  - In Guided Mode, users see a simplified "Awaiting Review" / "Approved" label.
  - In Advanced Mode, users may see reviewer identity and notes if permitted.

Settings integration notes (future Settings Registry keys):
  - execution.review_gate_enabled       : global on/off for review requirement
  - execution.review_gate_modules       : which modules require review (JSON list)
  - execution.review_gate_auto_approve  : auto-approve policy (admin-only override)
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.contracts.enums import ReviewStateStatus


class ReviewState(BaseModel):
    """
    Authoritative schema for a job's review gate state.

    Relationship to Job:
        One ReviewState per Job. The Job Detail page surfaces this as a
        dedicated "Review State" panel. SSE event job:review_state_changed
        is emitted on every status transition.

    Status lifecycle:
        NOT_REQUIRED     : Review gate disabled for this module/job.
                           This is the default until review gate is configured.
        PENDING_REVIEW   : Job completed production; output awaits human review.
        APPROVED         : Reviewer approved; publish adapter may proceed.
        REJECTED         : Reviewer rejected; job moves to FAILED or triggers
                           rerun depending on policy (future Phase).
        BLOCKED          : Review cannot proceed due to upstream failure
                           (e.g. render step failed). Distinct from REJECTED —
                           no human decision was made.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Stable UUID for this review state record.")
    job_id: str = Field(..., description="Parent job ID (1:1 relationship).")

    status: ReviewStateStatus = Field(
        default=ReviewStateStatus.NOT_REQUIRED,
        description="Current review gate status."
    )

    # Reviewer identity [admin-visible]
    reviewer_id: Optional[str] = Field(
        default=None,
        description=(
            "ID of the user who performed the review action. "
            "Null until a human action is recorded. [admin-visible]"
        )
    )
    reviewer_display_name: Optional[str] = Field(
        default=None,
        description="Display name of the reviewer at time of review. [admin-visible]"
    )

    # Decision context
    notes: Optional[str] = Field(
        default=None,
        description=(
            "Optional notes added by the reviewer at time of approval or rejection. "
            "[admin-visible + user-visible where VisibilityRule permits]"
        )
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        description=(
            "Structured rejection reason. Populated only when status=REJECTED. "
            "[admin-visible]"
        )
    )

    # Timestamps
    created_at: datetime = Field(
        ...,
        description="When the ReviewState record was created (typically when job completes production)."
    )
    reviewed_at: Optional[datetime] = Field(
        default=None,
        description="When the review decision (approved/rejected) was recorded."
    )
    updated_at: datetime = Field(
        ...,
        description="Last modification time."
    )
