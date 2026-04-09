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
