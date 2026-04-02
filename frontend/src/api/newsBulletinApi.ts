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

export async function createNewsBulletin(
  payload: NewsBulletinCreatePayload
): Promise<NewsBulletinResponse> {
  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create news bulletin: ${resp.status}`);
  return resp.json();
}

export async function updateNewsBulletin(
  id: string,
  payload: NewsBulletinUpdatePayload
): Promise<NewsBulletinResponse> {
  const resp = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update news bulletin ${id}: ${resp.status}`);
  return resp.json();
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

export async function fetchNewsBulletinScript(
  bulletinId: string
): Promise<NewsBulletinScriptResponse | null> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/script`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Failed to fetch script: ${resp.status}`);
  return resp.json();
}

export async function createNewsBulletinScript(
  bulletinId: string,
  payload: NewsBulletinScriptCreatePayload
): Promise<NewsBulletinScriptResponse> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create script: ${resp.status}`);
  return resp.json();
}

export async function updateNewsBulletinScript(
  bulletinId: string,
  payload: NewsBulletinScriptUpdatePayload
): Promise<NewsBulletinScriptResponse> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/script`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update script: ${resp.status}`);
  return resp.json();
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

export async function fetchNewsBulletinMetadata(
  bulletinId: string
): Promise<NewsBulletinMetadataResponse | null> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/metadata`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Failed to fetch metadata: ${resp.status}`);
  return resp.json();
}

export async function createNewsBulletinMetadata(
  bulletinId: string,
  payload: NewsBulletinMetadataCreatePayload
): Promise<NewsBulletinMetadataResponse> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create metadata: ${resp.status}`);
  return resp.json();
}

export async function updateNewsBulletinMetadata(
  bulletinId: string,
  payload: NewsBulletinMetadataUpdatePayload
): Promise<NewsBulletinMetadataResponse> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/metadata`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update metadata: ${resp.status}`);
  return resp.json();
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

export async function fetchNewsBulletinSelectedItems(
  bulletinId: string
): Promise<NewsBulletinSelectedItemResponse[]> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/selected-news`);
  if (!resp.ok) throw new Error(`Failed to fetch selected items: ${resp.status}`);
  return resp.json();
}

export async function createNewsBulletinSelectedItem(
  bulletinId: string,
  payload: NewsBulletinSelectedItemCreatePayload
): Promise<NewsBulletinSelectedItemResponse> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/selected-news`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create selected item: ${resp.status}`);
  return resp.json();
}

export async function updateNewsBulletinSelectedItem(
  bulletinId: string,
  selectionId: string,
  payload: NewsBulletinSelectedItemUpdatePayload
): Promise<NewsBulletinSelectedItemResponse> {
  const resp = await fetch(`/api/v1/modules/news-bulletin/${bulletinId}/selected-news/${selectionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update selected item: ${resp.status}`);
  return resp.json();
}

export async function fetchNewsBulletins(): Promise<NewsBulletinResponse[]> {
  const resp = await fetch(BASE_URL);
  if (!resp.ok) throw new Error(`Failed to fetch news bulletins: ${resp.status}`);
  return resp.json();
}

export async function fetchNewsBulletinById(id: string): Promise<NewsBulletinResponse> {
  const resp = await fetch(`${BASE_URL}/${id}`);
  if (!resp.ok) throw new Error(`Failed to fetch news bulletin ${id}: ${resp.status}`);
  return resp.json();
}
