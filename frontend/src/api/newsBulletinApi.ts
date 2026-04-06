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
  composition_direction: string | null;
  thumbnail_direction: string | null;
  template_id: string | null;
  style_blueprint_id: string | null;
  render_mode: string | null;
  subtitle_style: string | null;
  lower_third_style: string | null;
  trust_enforcement_level: string | null;
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
  composition_direction?: string | null;
  thumbnail_direction?: string | null;
  template_id?: string | null;
  style_blueprint_id?: string | null;
  render_mode?: string | null;
  subtitle_style?: string | null;
  lower_third_style?: string | null;
  trust_enforcement_level?: string | null;
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
  composition_direction?: string | null;
  thumbnail_direction?: string | null;
  template_id?: string | null;
  style_blueprint_id?: string | null;
  render_mode?: string | null;
  subtitle_style?: string | null;
  lower_third_style?: string | null;
  trust_enforcement_level?: string | null;
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
  edited_narration: string | null;
  created_at: string;
  updated_at: string;
  news_title?: string | null;
  news_category?: string | null;
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
  edited_narration?: string | null;
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

// ---------------------------------------------------------------------------
// Selectable news items (status='new')
// ---------------------------------------------------------------------------

export interface SelectableNewsItemResponse {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  source_id: string | null;
  published_at: string | null;
  language: string | null;
}

export function fetchSelectableNewsItems(
  bulletinId: string,
  params?: { source_id?: string; language?: string; limit?: number },
): Promise<SelectableNewsItemResponse[]> {
  return api.get<SelectableNewsItemResponse[]>(`${BASE_URL}/${bulletinId}/selectable-news`, params);
}

// ---------------------------------------------------------------------------
// Editorial gate operations
// ---------------------------------------------------------------------------

export interface ConfirmSelectionResponse {
  success: boolean;
  bulletin_id: string;
  confirmed_count: number;
  warning_items: string[];
  error?: string | null;
}

export function confirmBulletinSelection(bulletinId: string): Promise<ConfirmSelectionResponse> {
  return api.post<ConfirmSelectionResponse>(`${BASE_URL}/${bulletinId}/confirm-selection`, {});
}

export interface ConsumeNewsResponse {
  success: boolean;
  bulletin_id: string;
  consumed_count: number;
  already_used: string[];
  error?: string | null;
}

export function consumeBulletinNews(bulletinId: string): Promise<ConsumeNewsResponse> {
  return api.post<ConsumeNewsResponse>(`${BASE_URL}/${bulletinId}/consume-news`, {});
}

// ---------------------------------------------------------------------------
// Start production (M28 pipeline trigger)
// ---------------------------------------------------------------------------

export interface StartProductionResponse {
  job_id: string;
  bulletin_id: string;
  bulletin_status: string;
  message: string;
}

export function startBulletinProduction(bulletinId: string): Promise<StartProductionResponse> {
  return api.post<StartProductionResponse>(`${BASE_URL}/${bulletinId}/start-production`, {});
}

// ---------------------------------------------------------------------------
// Clone
// ---------------------------------------------------------------------------

export function cloneNewsBulletin(bulletinId: string): Promise<NewsBulletinResponse> {
  return api.post<NewsBulletinResponse>(`${BASE_URL}/${bulletinId}/clone`, {});
}

// ---------------------------------------------------------------------------
// Delete selected item
// ---------------------------------------------------------------------------

export function deleteNewsBulletinSelectedItem(
  bulletinId: string,
  selectionId: string,
): Promise<void> {
  return api.delete(`${BASE_URL}/${bulletinId}/selected-news/${selectionId}`);
}

// ---------------------------------------------------------------------------
// Trust enforcement check (M30)
// ---------------------------------------------------------------------------

export interface TrustCheckResponse {
  pass_check: boolean;
  enforcement_level: string;
  low_trust_items: Array<{
    news_item_id: string;
    source_id: string;
    source_name: string;
    trust_level: string;
  }>;
  total_checked: number;
  message: string;
}

export function fetchTrustCheck(bulletinId: string): Promise<TrustCheckResponse> {
  return api.get<TrustCheckResponse>(`${BASE_URL}/${bulletinId}/trust-check`);
}

// ---------------------------------------------------------------------------
// Category → Style suggestion (M30)
// ---------------------------------------------------------------------------

export interface CategoryStyleSuggestionResponse {
  suggested_subtitle_style: string;
  suggested_lower_third_style: string;
  suggested_composition_direction: string;
  category_matched: boolean;
  category_used: string;
  dominant_category: string | null;
}

export function fetchCategoryStyleSuggestion(
  bulletinId: string,
): Promise<CategoryStyleSuggestionResponse> {
  return api.get<CategoryStyleSuggestionResponse>(
    `${BASE_URL}/${bulletinId}/category-style-suggestion`,
  );
}
