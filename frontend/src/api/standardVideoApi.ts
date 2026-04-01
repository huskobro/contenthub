const BASE_URL = "/api/v1/modules/standard-video";

export interface StandardVideoResponse {
  id: string;
  title: string | null;
  topic: string;
  brief: string | null;
  target_duration_seconds: number | null;
  tone: string | null;
  language: string | null;
  visual_direction: string | null;
  subtitle_style: string | null;
  status: string;
  job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StandardVideoScriptResponse {
  id: string;
  standard_video_id: string;
  content: string;
  version: number;
  source_type: string;
  generation_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StandardVideoMetadataResponse {
  id: string;
  standard_video_id: string;
  title: string;
  description: string | null;
  tags_json: string | null;
  category: string | null;
  language: string | null;
  version: number;
  source_type: string;
  generation_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchStandardVideos(): Promise<StandardVideoResponse[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error(`Failed to fetch standard videos: ${res.status}`);
  return res.json();
}

export async function fetchStandardVideoById(id: string): Promise<StandardVideoResponse> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch standard video ${id}: ${res.status}`);
  return res.json();
}

export async function fetchStandardVideoScript(
  id: string
): Promise<StandardVideoScriptResponse | null> {
  const res = await fetch(`${BASE_URL}/${id}/script`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch script for ${id}: ${res.status}`);
  return res.json();
}

export async function fetchStandardVideoMetadata(
  id: string
): Promise<StandardVideoMetadataResponse | null> {
  const res = await fetch(`${BASE_URL}/${id}/metadata`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch metadata for ${id}: ${res.status}`);
  return res.json();
}

export interface StandardVideoCreatePayload {
  topic: string;
  title?: string | null;
  brief?: string | null;
  target_duration_seconds?: number | null;
  tone?: string | null;
  language?: string | null;
  visual_direction?: string | null;
  subtitle_style?: string | null;
  job_id?: string | null;
}

export interface StandardVideoUpdatePayload {
  topic?: string | null;
  title?: string | null;
  brief?: string | null;
  target_duration_seconds?: number | null;
  tone?: string | null;
  language?: string | null;
  visual_direction?: string | null;
  subtitle_style?: string | null;
  status?: string | null;
  job_id?: string | null;
}

export async function createStandardVideo(
  payload: StandardVideoCreatePayload
): Promise<StandardVideoResponse> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create standard video: ${res.status}`);
  return res.json();
}

export async function updateStandardVideo(
  id: string,
  payload: StandardVideoUpdatePayload
): Promise<StandardVideoResponse> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update standard video ${id}: ${res.status}`);
  return res.json();
}
