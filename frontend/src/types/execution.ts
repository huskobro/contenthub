/**
 * Execution Contract — Frontend Shared Types (Phase 1.1)
 *
 * TypeScript mirror of backend/app/contracts/enums.py.
 * These values MUST stay in sync with the Python enums.
 * When adding or removing values, update BOTH files.
 *
 * Usage:
 *   import { JobStatus, SSEEventType } from '@/types/execution';
 *
 * React Query / Zustand split reminder:
 *   - Server truth (jobs, steps, artifacts, settings, visibility) → React Query
 *   - SSE connection state (connected/disconnected, error, reconnectCount) → Zustand
 *   - Do NOT mirror server truth into Zustand stores.
 *
 * SSE event routing:
 *   - Global stream: all SSEEventType values
 *   - Job-specific stream: only "job:*" events for that job_id
 */

// ---------------------------------------------------------------------------
// Job lifecycle
// ---------------------------------------------------------------------------

export const JobStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  WAITING: "waiting",
  RETRYING: "retrying",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** States from which no further automatic transition occurs on the same Job record. */
export const JOB_TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set([
  JobStatus.COMPLETED,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
]);

// ---------------------------------------------------------------------------
// Job step lifecycle
// ---------------------------------------------------------------------------

export const JobStepStatus = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
  RETRYING: "retrying",
} as const;

export type JobStepStatus = (typeof JobStepStatus)[keyof typeof JobStepStatus];

export const STEP_TERMINAL_STATUSES: ReadonlySet<JobStepStatus> = new Set([
  JobStepStatus.COMPLETED,
  JobStepStatus.FAILED,
  JobStepStatus.SKIPPED,
]);

// ---------------------------------------------------------------------------
// Artifact classification
// ---------------------------------------------------------------------------

export const ArtifactKind = {
  SCRIPT: "script",
  METADATA: "metadata",
  AUDIO: "audio",
  SUBTITLE: "subtitle",
  VISUAL_ASSET: "visual_asset",
  COMPOSITION_PROPS: "composition_props",
  VIDEO_RENDER: "video_render",
  THUMBNAIL: "thumbnail",
  PUBLISH_PAYLOAD: "publish_payload",
  LOG: "log",
  GENERIC: "generic",
} as const;

export type ArtifactKind = (typeof ArtifactKind)[keyof typeof ArtifactKind];

export const ArtifactScope = {
  FINAL: "final",
  PREVIEW: "preview",
} as const;

export type ArtifactScope = (typeof ArtifactScope)[keyof typeof ArtifactScope];

export const ArtifactDurability = {
  DURABLE: "durable",
  TEMP: "temp",
} as const;

export type ArtifactDurability =
  (typeof ArtifactDurability)[keyof typeof ArtifactDurability];

// ---------------------------------------------------------------------------
// Provider classification
// ---------------------------------------------------------------------------

export const ProviderKind = {
  LLM: "llm",
  TTS: "tts",
  VISUALS: "visuals",
  WHISPER: "whisper",
  RENDER: "render",
  PUBLISH: "publish",
  INTERNAL: "internal",
} as const;

export type ProviderKind = (typeof ProviderKind)[keyof typeof ProviderKind];

export const ProviderTraceStatus = {
  SUCCESS: "success",
  FAILURE: "failure",
  TIMEOUT: "timeout",
  FALLBACK_USED: "fallback_used",
  SKIPPED: "skipped",
} as const;

export type ProviderTraceStatus =
  (typeof ProviderTraceStatus)[keyof typeof ProviderTraceStatus];

// ---------------------------------------------------------------------------
// Retry disposition
// ---------------------------------------------------------------------------

export const RetryDisposition = {
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  ABANDONED: "abandoned",
} as const;

export type RetryDisposition =
  (typeof RetryDisposition)[keyof typeof RetryDisposition];

// ---------------------------------------------------------------------------
// Review state
// ---------------------------------------------------------------------------

export const ReviewStateStatus = {
  NOT_REQUIRED: "not_required",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  BLOCKED: "blocked",
} as const;

export type ReviewStateStatus =
  (typeof ReviewStateStatus)[keyof typeof ReviewStateStatus];

// ---------------------------------------------------------------------------
// SSE event types
// ---------------------------------------------------------------------------

export const SSEEventType = {
  JOB_STATUS_CHANGED: "job:status_changed",
  JOB_STEP_CHANGED: "job:step_changed",
  JOB_PROGRESS: "job:progress",
  JOB_LOG: "job:log",
  JOB_ARTIFACT: "job:artifact",
  JOB_ERROR: "job:error",
  JOB_RETRY: "job:retry",
  JOB_REVIEW_STATE_CHANGED: "job:review_state_changed",
  MANIFEST_SETTINGS_CHANGED: "manifest:settings_changed",
  MANIFEST_VISIBILITY_CHANGED: "manifest:visibility_changed",
} as const;

export type SSEEventType = (typeof SSEEventType)[keyof typeof SSEEventType];

/** Events that are only delivered on the global SSE stream. */
export const GLOBAL_ONLY_EVENTS: ReadonlySet<SSEEventType> = new Set([
  SSEEventType.MANIFEST_SETTINGS_CHANGED,
  SSEEventType.MANIFEST_VISIBILITY_CHANGED,
]);

/** Events that are delivered on both global and job-specific streams. */
export const JOB_SCOPED_EVENTS: ReadonlySet<SSEEventType> = new Set([
  SSEEventType.JOB_STATUS_CHANGED,
  SSEEventType.JOB_STEP_CHANGED,
  SSEEventType.JOB_PROGRESS,
  SSEEventType.JOB_LOG,
  SSEEventType.JOB_ARTIFACT,
  SSEEventType.JOB_ERROR,
  SSEEventType.JOB_RETRY,
  SSEEventType.JOB_REVIEW_STATE_CHANGED,
]);

// ---------------------------------------------------------------------------
// React Query cache key helpers
//
// These are the canonical cache keys for execution-related server state.
// Use these constants when calling queryClient.invalidateQueries().
// ---------------------------------------------------------------------------

export const EXECUTION_QUERY_KEYS = {
  JOBS: "jobs",
  JOB_DETAIL: "job_detail",
  JOB_STEPS: "job_steps",
  JOB_ARTIFACTS: "job_artifacts",
  REVIEW_STATE: "review_state",
  SETTINGS_MANIFEST: "settings_manifest",
  VISIBILITY_MANIFEST: "visibility_manifest",
} as const;

export type ExecutionQueryKey =
  (typeof EXECUTION_QUERY_KEYS)[keyof typeof EXECUTION_QUERY_KEYS];

// ---------------------------------------------------------------------------
// SSE Envelope type (mirrors backend SSEEnvelope)
// ---------------------------------------------------------------------------

export interface SSEEnvelope {
  event: SSEEventType;
  /** 'global' or a job_id string */
  stream_scope: string;
  emitted_at: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// SSE payload types (mirrors backend sse_events.py payload schemas)
// ---------------------------------------------------------------------------

export interface JobStatusChangedPayload {
  job_id: string;
  previous_status: JobStatus;
  new_status: JobStatus;
  current_step_key: string | null;
  elapsed_total_seconds: number | null;
  estimated_remaining_seconds: number | null;
  last_error: string | null;
  invalidate_keys: string[];
}

export interface JobStepChangedPayload {
  job_id: string;
  step_key: string;
  step_order: number;
  previous_status: JobStepStatus;
  new_status: JobStepStatus;
  elapsed_seconds: number | null;
  last_error: string | null;
  invalidate_keys: string[];
}

export interface JobProgressPayload {
  job_id: string;
  step_key: string;
  percent_complete: number | null;
  progress_label: string | null;
  elapsed_step_seconds: number | null;
  estimated_step_remaining_seconds: number | null;
}

export interface JobLogPayload {
  job_id: string;
  step_key: string | null;
  level: "debug" | "info" | "warning" | "error";
  message: string;
  emitted_at: string;
  admin_only: boolean;
}

export interface JobArtifactPayload {
  job_id: string;
  step_key: string;
  artifact_id: string;
  artifact_kind: ArtifactKind;
  artifact_scope: ArtifactScope;
  artifact_durability: ArtifactDurability;
  display_name: string;
  local_path: string;
  invalidate_keys: string[];
}

export interface JobErrorPayload {
  job_id: string;
  step_key: string | null;
  error_code: string | null;
  message: string;
  recoverable: boolean;
}

export interface JobRetryPayload {
  job_id: string;
  level: "job" | "step";
  attempt_number: number;
  triggered_by: "system" | "user";
  affected_step_key: string | null;
  reason: string | null;
  invalidate_keys: string[];
}

export interface JobReviewStateChangedPayload {
  job_id: string;
  previous_status: ReviewStateStatus;
  new_status: ReviewStateStatus;
  reviewer_display_name: string | null;
  notes: string | null;
  invalidate_keys: string[];
}

export interface ManifestSettingsChangedPayload {
  changed_keys: string[];
  invalidate_keys: string[];
}

export interface ManifestVisibilityChangedPayload {
  affected_targets: string[];
  invalidate_keys: string[];
}
