"""
Execution Contract — Enumerations (Phase 1.1)

Single source of truth for all status/kind values used by the execution engine.
No other module should re-declare these. Import from here.

Visibility note:
  Fields tagged [admin-visible] must only be surfaced to admin role unless a
  matching VisibilityRule grants user-level access. The Visibility Engine is
  the authoritative gatekeeper; these tags are documentation reminders.
"""

from enum import Enum


# ---------------------------------------------------------------------------
# Job lifecycle
# ---------------------------------------------------------------------------

class JobStatus(str, Enum):
    """
    Authoritative job lifecycle states.

    Transitions are enforced by JobStateMachine in state_machine.py.
    The string value is stored directly in the DB column `jobs.status`.

    queued    : Job created, waiting for an executor slot.
                Required fields: module_type, created_at
                Nullable fields: started_at, finished_at, current_step_key

    running   : Executor has picked up the job and a step is active.
                Required fields: started_at, current_step_key
                Nullable fields: finished_at

    waiting   : Job is paused between steps (e.g. waiting for review gate
                or an async external response). Not the same as queued —
                the job has already started.
                Required fields: started_at, current_step_key

    retrying  : A step or the job itself failed and an automatic retry has
                been scheduled. retry_count is incremented before entering
                this state.
                Required fields: started_at, retry_count > 0

    completed : All steps finished successfully.
                Required fields: started_at, finished_at
                Nullable fields: current_step_key (cleared)

    failed    : Terminal failure — all retry attempts exhausted or a
                non-retryable error occurred.
                Required fields: started_at, finished_at, last_error
                Note: re-running a failed job is a separate "clone/rerun"
                operation and creates a new Job record.

    cancelled : Explicitly cancelled by user or admin before completion.
                Required fields: finished_at
    """
    QUEUED = "queued"
    RUNNING = "running"
    WAITING = "waiting"
    RETRYING = "retrying"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ---------------------------------------------------------------------------
# Job step lifecycle
# ---------------------------------------------------------------------------

class JobStepStatus(str, Enum):
    """
    Authoritative step lifecycle states.

    Transitions are enforced by StepStateMachine in state_machine.py.
    The string value is stored in `job_steps.status`.

    pending   : Step defined but not yet started. All steps begin here.
                timeline: created_at set, started_at null
                artifact/log: none yet

    running   : Step is actively executing.
                timeline: started_at set
                elapsed: ticking

    completed : Step finished successfully. Artifacts and logs available.
                timeline: finished_at set, elapsed_seconds calculated
                artifact: artifact_refs_json populated

    failed    : Step encountered a terminal error (retries exhausted or
                non-retryable). last_error set.
                timeline: finished_at set
                artifact: partial artifacts may exist — do not treat as final

    skipped   : Step was intentionally bypassed (e.g. disabled by settings,
                already satisfied, or module config excludes it).
                timeline: finished_at set to skip time
                artifact: none (by design)

    retrying  : Step failed and an automatic retry is pending. The step
                returns to running on next attempt.
                timeline: started_at retains first-start; each retry is
                recorded in RetryHistory
    """
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"


# ---------------------------------------------------------------------------
# Artifact classification
# ---------------------------------------------------------------------------

class ArtifactKind(str, Enum):
    """
    What kind of content the artifact represents.

    Used for filtering in the Job Detail artifacts panel and for future
    analytics (e.g. average render duration by artifact kind).
    [admin-visible + user-visible where VisibilityRule permits]
    """
    SCRIPT = "script"                 # Generated narration/scene script
    METADATA = "metadata"             # Title, description, tags, SEO
    AUDIO = "audio"                   # TTS or uploaded audio track
    SUBTITLE = "subtitle"             # SRT / word-level alignment data
    VISUAL_ASSET = "visual_asset"     # Downloaded stock image/video clip
    COMPOSITION_PROPS = "composition_props"  # Remotion props JSON
    VIDEO_RENDER = "video_render"     # Final or preview rendered video
    THUMBNAIL = "thumbnail"           # Thumbnail image
    PUBLISH_PAYLOAD = "publish_payload"  # Data sent to publish adapter
    LOG = "log"                       # Captured log output
    GENERIC = "generic"               # Catch-all for unclassified outputs


class ArtifactScope(str, Enum):
    """
    Whether the artifact belongs to the final output or is a preview.

    FINAL   : Source-of-truth output. Used for publish, review, and archival.
    PREVIEW : Lightweight representation for user selection UI. Must be
              clearly distinguished from final in the UI.
              Preview artifacts are NEVER used as publish source.
    """
    FINAL = "final"
    PREVIEW = "preview"


class ArtifactDurability(str, Enum):
    """
    Whether the artifact should be retained or is safe to delete/regenerate.

    DURABLE : Must be kept. Deleting would break job traceability or
              block publish/review. Stored under workspace/{job_id}/final/
              or workspace/{job_id}/preview/.
    TEMP    : Intermediate processing file. Safe to delete. MUST NOT be
              treated as source of truth. Stored under workspace/{job_id}/tmp/.
              Examples: downloaded raw stock clips before encoding,
              intermediate audio segments before merge.
    """
    DURABLE = "durable"
    TEMP = "temp"


# ---------------------------------------------------------------------------
# Provider classification
# ---------------------------------------------------------------------------

class ProviderKind(str, Enum):
    """
    Category of external (or internal) service provider.

    Used by ProviderTrace and future Provider Registry / Admin surface.
    [admin-visible]
    """
    LLM = "llm"                   # Language model (script, metadata)
    TTS = "tts"                   # Text-to-speech
    VISUALS = "visuals"           # Stock image/video provider
    WHISPER = "whisper"           # Speech-to-text / subtitle alignment
    RENDER = "render"             # Remotion render process
    PUBLISH = "publish"           # YouTube / platform publish adapter
    INTERNAL = "internal"         # ContentHub internal step (no external call)


class ProviderTraceStatus(str, Enum):
    """
    Outcome of a single provider invocation.

    [admin-visible]
    """
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    FALLBACK_USED = "fallback_used"   # Primary failed; secondary provider used
    SKIPPED = "skipped"               # Provider call bypassed (e.g. cached)


# ---------------------------------------------------------------------------
# Retry disposition
# ---------------------------------------------------------------------------

class RetryDisposition(str, Enum):
    """
    How a retry attempt concluded.

    SUCCEEDED  : Retry fixed the problem; job/step moved to completed/running.
    FAILED     : Retry also failed; counter incremented again.
    ABANDONED  : Max retries reached; job/step moved to failed.
    [admin-visible]
    """
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    ABANDONED = "abandoned"


# ---------------------------------------------------------------------------
# Review state
# ---------------------------------------------------------------------------

class ReviewStateStatus(str, Enum):
    """
    Gate status for the manual review flow (Phase 1.7+).

    NOT_REQUIRED   : No review gate configured for this job/module.
    PENDING_REVIEW : Output ready; awaiting human approval.
    APPROVED       : Reviewer approved; job may proceed to publish.
    REJECTED       : Reviewer rejected output; job moves to failed or
                     triggers a rerun depending on policy.
    BLOCKED        : Review cannot proceed due to an upstream problem
                     (e.g. render failed). Distinct from REJECTED.
    [admin-visible + user-visible where VisibilityRule permits]
    """
    NOT_REQUIRED = "not_required"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLOCKED = "blocked"


# ---------------------------------------------------------------------------
# SSE event types
# ---------------------------------------------------------------------------

class SSEEventType(str, Enum):
    """
    Authoritative SSE event type identifiers.

    Frontend consumers MUST use these string values for event routing.
    The frontend TypeScript mirror in frontend/src/types/execution.ts must
    stay in sync with this enum.

    Job-scoped events (delivered on both global and job-specific streams):
        job:status_changed       — Job moved to a new JobStatus
        job:step_changed         — A step moved to a new JobStepStatus
        job:progress             — Numeric progress update (percent or step index)
        job:log                  — Log line appended to a step or job
        job:artifact             — New artifact registered for a job/step
        job:error                — Non-fatal error surfaced mid-execution
        job:retry                — A retry has been scheduled or attempted
        job:review_state_changed — ReviewState changed (pending/approved/rejected)

    Platform-scoped events (global stream only):
        manifest:settings_changed    — Settings Registry changed; clients should
                                       re-fetch the settings manifest and
                                       invalidate relevant React Query keys.
        manifest:visibility_changed  — Visibility manifest changed; clients should
                                       re-fetch and re-apply visibility rules.
    """
    JOB_STATUS_CHANGED = "job:status_changed"
    JOB_STEP_CHANGED = "job:step_changed"
    JOB_PROGRESS = "job:progress"
    JOB_LOG = "job:log"
    JOB_ARTIFACT = "job:artifact"
    JOB_ERROR = "job:error"
    JOB_RETRY = "job:retry"
    JOB_REVIEW_STATE_CHANGED = "job:review_state_changed"
    MANIFEST_SETTINGS_CHANGED = "manifest:settings_changed"
    MANIFEST_VISIBILITY_CHANGED = "manifest:visibility_changed"
