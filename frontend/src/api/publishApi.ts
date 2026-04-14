import { api } from "./client";

const BASE_URL = "/api/v1/publish";

export interface PublishRecordSummary {
  id: string;
  job_id: string;
  content_ref_type: string;
  content_ref_id: string;
  platform: string;
  status: string;
  review_state: string;
  publish_attempt_count: number;
  scheduled_at: string | null;
  published_at: string | null;
  platform_url: string | null;
  // V2 fields — Faz 11
  content_project_id: string | null;
  platform_connection_id: string | null;
  // Gate 4 (Z-5): error category for triage UX. Allowed values:
  // 'token_error' | 'quota_exceeded' | 'network' | 'validation'
  // | 'permission' | 'asset_missing' | 'unknown' | null.
  last_error_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishRecordRead {
  id: string;
  job_id: string;
  content_ref_type: string;
  content_ref_id: string;
  platform: string;
  status: string;
  review_state: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  platform_video_id: string | null;
  platform_url: string | null;
  publish_attempt_count: number;
  last_error: string | null;
  payload_json: string | null;
  result_json: string | null;
  notes: string | null;
  // V2 fields — Faz 11
  content_project_id: string | null;
  platform_connection_id: string | null;
  publish_intent_json: string | null;
  publish_result_json: string | null;
  // Gate 4 (Z-5)
  last_error_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishLogRead {
  id: string;
  publish_record_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  from_status: string | null;
  to_status: string | null;
  detail_json: string;
  note: string | null;
  created_at: string;
}

export interface PublishListParams {
  job_id?: string;
  platform?: string;
  status?: string;
  content_ref_type?: string;
  /** Gate 4 (Z-5): triage filter for failed publishes. */
  error_category?: string;
  limit?: number;
  offset?: number;
}

export function fetchPublishRecords(
  params: PublishListParams = {},
): Promise<PublishRecordSummary[]> {
  return api.get<PublishRecordSummary[]>(`${BASE_URL}/`, params);
}

export function fetchPublishRecord(id: string): Promise<PublishRecordRead> {
  return api.get<PublishRecordRead>(`${BASE_URL}/${id}`);
}

export function fetchPublishLogs(
  recordId: string,
  limit = 100,
): Promise<PublishLogRead[]> {
  return api.get<PublishLogRead[]>(`${BASE_URL}/${recordId}/logs`, { limit });
}

export function submitForReview(recordId: string): Promise<PublishRecordRead> {
  return api.post<PublishRecordRead>(`${BASE_URL}/${recordId}/submit`);
}

export function reviewAction(
  recordId: string,
  decision: "approve" | "reject",
  note?: string,
  rejectionReason?: string,
): Promise<PublishRecordRead> {
  return api.post<PublishRecordRead>(`${BASE_URL}/${recordId}/review`, {
    decision,
    note,
    rejection_reason: rejectionReason,
  });
}

export function schedulePublish(
  recordId: string,
  scheduledAt: string,
  note?: string,
): Promise<PublishRecordRead> {
  return api.post<PublishRecordRead>(`${BASE_URL}/${recordId}/schedule`, { scheduled_at: scheduledAt, note });
}

export function triggerPublish(
  recordId: string,
  note?: string,
): Promise<PublishRecordRead> {
  return api.post<PublishRecordRead>(`${BASE_URL}/${recordId}/trigger`, { note });
}

export function cancelPublish(
  recordId: string,
  note?: string,
): Promise<PublishRecordRead> {
  return api.post<PublishRecordRead>(`${BASE_URL}/${recordId}/cancel`, { note });
}

export function retryPublish(
  recordId: string,
  note?: string,
): Promise<PublishRecordRead> {
  return api.post<PublishRecordRead>(`${BASE_URL}/${recordId}/retry`, { note });
}

export function resetToDraft(recordId: string): Promise<PublishRecordRead> {
  return api.post<PublishRecordRead>(`${BASE_URL}/${recordId}/reset-to-draft`);
}

export function patchPublishPayload(
  recordId: string,
  payloadJson: string,
): Promise<PublishRecordRead> {
  return api.patch<PublishRecordRead>(`${BASE_URL}/${recordId}`, { payload_json: payloadJson });
}

export interface PublishFromJobBody {
  platform: string;
  content_ref_type: string;
  content_ref_id?: string;
  // V2 fields — Faz 11
  content_project_id?: string;
  platform_connection_id?: string;
}

export function createPublishRecordFromJob(
  jobId: string,
  body: PublishFromJobBody,
): Promise<PublishRecordRead> {
  return api.post<PublishRecordRead>(`${BASE_URL}/from-job/${jobId}`, body);
}


// ---------------------------------------------------------------------------
// V2 — Faz 11: Project-based listing + intent update
// ---------------------------------------------------------------------------

export function fetchPublishRecordsByProject(
  contentProjectId: string,
  limit = 50,
): Promise<PublishRecordSummary[]> {
  return api.get<PublishRecordSummary[]>(
    `${BASE_URL}/by-project/${contentProjectId}`,
    { limit },
  );
}

export interface PublishIntentData {
  title?: string;
  description?: string;
  tags?: string[];
  privacy_status?: string;
  scheduled_at?: string;
  category_id?: string;
  playlist_ids?: string[];
  thumbnail_path?: string;
  notify_subscribers?: boolean;
}

export function updatePublishIntent(
  recordId: string,
  intent: PublishIntentData,
): Promise<PublishRecordRead> {
  return api.patch<PublishRecordRead>(`${BASE_URL}/${recordId}/intent`, intent);
}


// ---------------------------------------------------------------------------
// Gate 4 (Publish Closure) — Bulk actions (Z-1)
// ---------------------------------------------------------------------------

export interface BulkActionItemResult {
  record_id: string;
  ok: boolean;
  status_after: string | null;
  /**
   * Stable error code:
   *   'not_found' | 'review_gate' | 'publish_gate' | 'terminal'
   *   | 'invalid_transition' | 'invalid_request' | 'internal'
   */
  error_code: string | null;
  error_message: string | null;
}

export interface BulkActionResponse {
  action: "approve" | "reject" | "cancel" | "retry";
  requested: number;
  succeeded: number;
  failed: number;
  results: BulkActionItemResult[];
}

export interface BulkActionBody {
  record_ids: string[];
  actor_id?: string;
  note?: string;
}

export interface BulkRejectBody extends BulkActionBody {
  /** Required by backend; empty string is rejected with HTTP 422. */
  rejection_reason: string;
}

export function bulkApprovePublishRecords(
  body: BulkActionBody,
): Promise<BulkActionResponse> {
  return api.post<BulkActionResponse>(`${BASE_URL}/bulk/approve`, body);
}

export function bulkRejectPublishRecords(
  body: BulkRejectBody,
): Promise<BulkActionResponse> {
  return api.post<BulkActionResponse>(`${BASE_URL}/bulk/reject`, body);
}

export function bulkCancelPublishRecords(
  body: BulkActionBody,
): Promise<BulkActionResponse> {
  return api.post<BulkActionResponse>(`${BASE_URL}/bulk/cancel`, body);
}

export function bulkRetryPublishRecords(
  body: BulkActionBody,
): Promise<BulkActionResponse> {
  return api.post<BulkActionResponse>(`${BASE_URL}/bulk/retry`, body);
}


// ---------------------------------------------------------------------------
// Gate 4 (Publish Closure) — Scheduler health (Z-3)
// ---------------------------------------------------------------------------

export interface SchedulerHealth {
  /** 'unknown' (no tick yet) | 'healthy' | 'stale' */
  state: "unknown" | "healthy" | "stale";
  started_at: string | null;
  last_tick_at: string | null;
  last_due_count: number;
  last_triggered_count: number;
  /** Pre-flight skip (requires_reauth) count for last tick. */
  last_skipped_count: number;
  total_ticks: number;
  total_triggered: number;
  total_skipped: number;
  consecutive_errors: number;
  last_error: string | null;
  interval_seconds: number;
  stale_threshold_seconds: number;
}

export function fetchSchedulerHealth(): Promise<SchedulerHealth> {
  return api.get<SchedulerHealth>(`${BASE_URL}/scheduler/status`);
}


// ---------------------------------------------------------------------------
// Gate 4 (Publish Closure) — Token expiry (Z-4)
// ---------------------------------------------------------------------------

export interface TokenStatus {
  connection_id: string;
  /** 'ok' | 'warn' | 'critical' | 'expired' | 'reauth' | 'unknown' */
  severity: "ok" | "warn" | "critical" | "expired" | "reauth" | "unknown";
  seconds_remaining: number | null;
  expires_at: string | null;
  requires_reauth: boolean;
  has_refresh_token: boolean;
  /** True only when severity='reauth'. Scheduler skips publishes for these. */
  is_blocking: boolean;
  suggested_action: string | null;
}

export function fetchConnectionTokenStatus(
  connectionId: string,
): Promise<TokenStatus> {
  return api.get<TokenStatus>(
    `${BASE_URL}/connections/${connectionId}/token-status`,
  );
}
