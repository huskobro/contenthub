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
  published_at: string | null;
  platform_url: string | null;
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
  limit?: number;
  offset?: number;
}

export async function fetchPublishRecords(
  params: PublishListParams = {},
): Promise<PublishRecordSummary[]> {
  const qs = new URLSearchParams();
  if (params.job_id) qs.set("job_id", params.job_id);
  if (params.platform) qs.set("platform", params.platform);
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const url = qs.toString() ? `${BASE_URL}/?${qs}` : `${BASE_URL}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch publish records: ${res.status}`);
  return res.json();
}

export async function fetchPublishRecord(id: string): Promise<PublishRecordRead> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch publish record: ${res.status}`);
  return res.json();
}

export async function fetchPublishLogs(
  recordId: string,
  limit = 100,
): Promise<PublishLogRead[]> {
  const res = await fetch(`${BASE_URL}/${recordId}/logs?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch publish logs: ${res.status}`);
  return res.json();
}

export async function submitForReview(recordId: string): Promise<PublishRecordRead> {
  const res = await fetch(`${BASE_URL}/${recordId}/submit`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Submit failed: ${res.status}`);
  }
  return res.json();
}

export async function reviewAction(
  recordId: string,
  decision: "approve" | "reject",
  note?: string,
): Promise<PublishRecordRead> {
  const res = await fetch(`${BASE_URL}/${recordId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Review failed: ${res.status}`);
  }
  return res.json();
}

export async function schedulePublish(
  recordId: string,
  scheduledAt: string,
  note?: string,
): Promise<PublishRecordRead> {
  const res = await fetch(`${BASE_URL}/${recordId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduled_at: scheduledAt, note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Schedule failed: ${res.status}`);
  }
  return res.json();
}

export async function triggerPublish(
  recordId: string,
  note?: string,
): Promise<PublishRecordRead> {
  const res = await fetch(`${BASE_URL}/${recordId}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Trigger failed: ${res.status}`);
  }
  return res.json();
}

export async function cancelPublish(
  recordId: string,
  note?: string,
): Promise<PublishRecordRead> {
  const res = await fetch(`${BASE_URL}/${recordId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Cancel failed: ${res.status}`);
  }
  return res.json();
}

export async function retryPublish(
  recordId: string,
  note?: string,
): Promise<PublishRecordRead> {
  const res = await fetch(`${BASE_URL}/${recordId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Retry failed: ${res.status}`);
  }
  return res.json();
}

export async function resetToDraft(recordId: string): Promise<PublishRecordRead> {
  const res = await fetch(`${BASE_URL}/${recordId}/reset-to-draft`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Reset failed: ${res.status}`);
  }
  return res.json();
}
