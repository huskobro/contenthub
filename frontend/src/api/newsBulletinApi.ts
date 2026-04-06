import { api } from "./client";

const BASE_URL = "/api/v1/modules/news-bulletin";

export interface NewsBulletinResponse {
  id: string;
  title: string | null;
  topic: string;
  brief: string | null;
  target_duration_seconds: number | null;
  language: string | null;
  tone: string | null;
  bulletin_style: string | null;
  source_mode: string | null;
  selected_news_ids_json: string | null;
  status: string;
  job_id: string | null;
  created_at: string;
  updated_at: string;
  has_script?: boolean;
  has_metadata?: boolean;
  selected_news_count?: number;
  has_selected_news_warning?: boolean;
  selected_news_warning_count?: number;
  selected_news_source_count?: number;
  has_selected_news_missing_source?: boolean;
  selected_news_quality_complete_count?: number;
  selected_news_quality_partial_count?: number;
  selected_news_quality_weak_count?: number;
}

export interface NewsBulletinCreatePayload {
  topic: string;
  title?: string;
  brief?: string;
  target_duration_seconds?: number | null;
  language?: string;
  tone?: string;
  bulletin_style?: string;
  source_mode?: string;
  selected_news_ids_json?: string | null;
  status?: string;
}

export interface NewsBulletinUpdatePayload {
  topic?: string;
  title?: string | null;
  brief?: string | null;
  target_duration_seconds?: number | null;
  language?: string | null;
  tone?: string | null;
  bulletin_style?: string | null;
  source_mode?: string | null;
  selected_news_ids_json?: string | null;
  status?: string;
}

export function createNewsBulletin(
  payload: NewsBulletinCreatePayload
): Promise<NewsBulletinResponse> {
  return api.post<NewsBulletinResponse>(BASE_URL, payload);
}

export function updateNewsBulletin(
  id: string,
  payload: NewsBulletinUpdatePayload
): Promise<NewsBulletinResponse> {
  return api.patch<NewsBulletinResponse>(`${BASE_URL}/${id}`, payload);
}

export interface NewsBulletinScriptResponse {
  id: string;
  news_bulletin_id: string;
  content: string;
  version: number;
  source_type: string | null;
  generation_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsBulletinScriptCreatePayload {
  content: string;
  source_type?: string;
  generation_status?: string;
  notes?: string;
}

export interface NewsBulletinScriptUpdatePayload {
  content?: string;
  source_type?: string | null;
  generation_status?: string;
  notes?: string | null;
}

export function fetchNewsBulletinScript(
  bulletinId: string
): Promise<NewsBulletinScriptResponse | null> {
  return api.getOrNull<NewsBulletinScriptResponse>(`${BASE_URL}/${bulletinId}/script`);
}

export function createNewsBulletinScript(
  bulletinId: string,
  payload: NewsBulletinScriptCreatePayload
): Promise<NewsBulletinScriptResponse> {
  return api.post<NewsBulletinScriptResponse>(`${BASE_URL}/${bulletinId}/script`, payload);
}

export function updateNewsBulletinScript(
  bulletinId: string,
  payload: NewsBulletinScriptUpdatePayload
): Promise<NewsBulletinScriptResponse> {
  return api.patch<NewsBulletinScriptResponse>(`${BASE_URL}/${bulletinId}/script`, payload);
}

export interface NewsBulletinMetadataResponse {
  id: string;
  news_bulletin_id: string;
  title: string | null;
  description: string | null;
  tags_json: string | null;
  category: string | null;
  language: string | null;
  version: number;
  source_type: string | null;
  generation_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsBulletinMetadataCreatePayload {
  title?: string;
  description?: string;
  tags_json?: string;
  category?: string;
  language?: string;
  source_type?: string;
  generation_status?: string;
  notes?: string;
}

export interface NewsBulletinMetadataUpdatePayload {
  title?: string | null;
  description?: string | null;
  tags_json?: string | null;
  category?: string | null;
  language?: string | null;
  source_type?: string | null;
  generation_status?: string;
  notes?: string | null;
}

export function fetchNewsBulletinMetadata(
  bulletinId: string
): Promise<NewsBulletinMetadataResponse | null> {
  return api.getOrNull<NewsBulletinMetadataResponse>(`${BASE_URL}/${bulletinId}/metadata`);
}

export function createNewsBulletinMetadata(
  bulletinId: string,
  payload: NewsBulletinMetadataCreatePayload
): Promise<NewsBulletinMetadataResponse> {
  return api.post<NewsBulletinMetadataResponse>(`${BASE_URL}/${bulletinId}/metadata`, payload);
}

export function updateNewsBulletinMetadata(
  bulletinId: string,
  payload: NewsBulletinMetadataUpdatePayload
): Promise<NewsBulletinMetadataResponse> {
  return api.patch<NewsBulletinMetadataResponse>(`${BASE_URL}/${bulletinId}/metadata`, payload);
}

export interface NewsBulletinSelectedItemResponse {
  id: string;
  news_bulletin_id: string;
  news_item_id: string;
  sort_order: number;
  selection_reason: string | null;
  created_at: string;
  updated_at: string;
  used_news_count?: number;
  used_news_warning?: boolean;
  last_usage_type?: string | null;
  last_target_module?: string | null;
}

export interface NewsBulletinSelectedItemCreatePayload {
  news_item_id: string;
  sort_order?: number;
  selection_reason?: string;
}

export interface NewsBulletinSelectedItemUpdatePayload {
  sort_order?: number;
  selection_reason?: string | null;
}

export function fetchNewsBulletinSelectedItems(
  bulletinId: string
): Promise<NewsBulletinSelectedItemResponse[]> {
  return api.get<NewsBulletinSelectedItemResponse[]>(`${BASE_URL}/${bulletinId}/selected-news`);
}

export function createNewsBulletinSelectedItem(
  bulletinId: string,
  payload: NewsBulletinSelectedItemCreatePayload
): Promise<NewsBulletinSelectedItemResponse> {
  return api.post<NewsBulletinSelectedItemResponse>(`${BASE_URL}/${bulletinId}/selected-news`, payload);
}

export function updateNewsBulletinSelectedItem(
  bulletinId: string,
  selectionId: string,
  payload: NewsBulletinSelectedItemUpdatePayload
): Promise<NewsBulletinSelectedItemResponse> {
  return api.patch<NewsBulletinSelectedItemResponse>(`${BASE_URL}/${bulletinId}/selected-news/${selectionId}`, payload);
}

export interface NewsBulletinListParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function fetchNewsBulletins(
  params?: NewsBulletinListParams,
): Promise<NewsBulletinResponse[]> {
  return api.get<NewsBulletinResponse[]>(BASE_URL, params);
}

export function fetchNewsBulletinById(id: string): Promise<NewsBulletinResponse> {
  return api.get<NewsBulletinResponse>(`${BASE_URL}/${id}`);
}
