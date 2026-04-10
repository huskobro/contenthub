import { api } from "./client";

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
  template_id: string | null;
  style_blueprint_id: string | null;
  status: string;
  job_id: string | null;
  content_project_id: string | null;
  created_at: string;
  updated_at: string;
  has_script?: boolean;
  has_metadata?: boolean;
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

export interface StandardVideoListParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function fetchStandardVideos(
  params?: StandardVideoListParams,
): Promise<StandardVideoResponse[]> {
  return api.get<StandardVideoResponse[]>(BASE_URL, params);
}

export function fetchStandardVideoById(id: string): Promise<StandardVideoResponse> {
  return api.get<StandardVideoResponse>(`${BASE_URL}/${id}`);
}

export function fetchStandardVideoScript(
  id: string
): Promise<StandardVideoScriptResponse | null> {
  return api.getOrNull<StandardVideoScriptResponse>(`${BASE_URL}/${id}/script`);
}

export function fetchStandardVideoMetadata(
  id: string
): Promise<StandardVideoMetadataResponse | null> {
  return api.getOrNull<StandardVideoMetadataResponse>(`${BASE_URL}/${id}/metadata`);
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

export function createStandardVideo(
  payload: StandardVideoCreatePayload
): Promise<StandardVideoResponse> {
  return api.post<StandardVideoResponse>(BASE_URL, payload);
}

export function updateStandardVideo(
  id: string,
  payload: StandardVideoUpdatePayload
): Promise<StandardVideoResponse> {
  return api.patch<StandardVideoResponse>(`${BASE_URL}/${id}`, payload);
}

export interface StandardVideoScriptCreatePayload {
  content: string;
  source_type?: string | null;
  generation_status?: string | null;
  notes?: string | null;
}

export interface StandardVideoScriptUpdatePayload {
  content?: string | null;
  source_type?: string | null;
  generation_status?: string | null;
  notes?: string | null;
}

export function createStandardVideoScript(
  videoId: string,
  payload: StandardVideoScriptCreatePayload
): Promise<StandardVideoScriptResponse> {
  return api.post<StandardVideoScriptResponse>(`${BASE_URL}/${videoId}/script`, payload);
}

export function updateStandardVideoScript(
  videoId: string,
  payload: StandardVideoScriptUpdatePayload
): Promise<StandardVideoScriptResponse> {
  return api.patch<StandardVideoScriptResponse>(`${BASE_URL}/${videoId}/script`, payload);
}

export interface StandardVideoMetadataCreatePayload {
  title: string;
  description?: string | null;
  tags_json?: string | null;
  category?: string | null;
  language?: string | null;
  source_type?: string | null;
  generation_status?: string | null;
  notes?: string | null;
}

export interface StandardVideoMetadataUpdatePayload {
  title?: string | null;
  description?: string | null;
  tags_json?: string | null;
  category?: string | null;
  language?: string | null;
  source_type?: string | null;
  generation_status?: string | null;
  notes?: string | null;
}

export function createStandardVideoMetadata(
  videoId: string,
  payload: StandardVideoMetadataCreatePayload
): Promise<StandardVideoMetadataResponse> {
  return api.post<StandardVideoMetadataResponse>(`${BASE_URL}/${videoId}/metadata`, payload);
}

export function updateStandardVideoMetadata(
  videoId: string,
  payload: StandardVideoMetadataUpdatePayload
): Promise<StandardVideoMetadataResponse> {
  return api.patch<StandardVideoMetadataResponse>(`${BASE_URL}/${videoId}/metadata`, payload);
}

export interface StartProductionResponse {
  job_id: string;
  video_id: string;
  video_status: string;
  message: string;
}

export function startStandardVideoProduction(
  videoId: string,
): Promise<StartProductionResponse> {
  return api.post<StartProductionResponse>(`${BASE_URL}/${videoId}/start-production`, {});
}
