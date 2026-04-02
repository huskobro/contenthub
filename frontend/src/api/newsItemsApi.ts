const BASE_URL = "/api/v1/news-items";

export interface NewsItemResponse {
  id: string;
  title: string;
  url: string;
  status: string;
  source_id: string | null;
  source_scan_id: string | null;
  summary: string | null;
  published_at: string | null;
  language: string | null;
  category: string | null;
  dedupe_key: string | null;
  raw_payload_json: string | null;
  created_at: string;
  updated_at: string;
  usage_count?: number;
  last_usage_type?: string | null;
  last_target_module?: string | null;
  source_name?: string | null;
  source_status?: string | null;
}

export interface NewsItemCreatePayload {
  title: string;
  url: string;
  status?: string;
  source_id?: string | null;
  source_scan_id?: string | null;
  summary?: string | null;
  published_at?: string | null;
  language?: string | null;
  category?: string | null;
  dedupe_key?: string | null;
  raw_payload_json?: string | null;
}

export interface NewsItemUpdatePayload {
  title?: string;
  url?: string;
  status?: string;
  source_id?: string | null;
  source_scan_id?: string | null;
  summary?: string | null;
  published_at?: string | null;
  language?: string | null;
  category?: string | null;
  dedupe_key?: string | null;
  raw_payload_json?: string | null;
}

export async function fetchNewsItems(): Promise<NewsItemResponse[]> {
  const resp = await fetch(BASE_URL);
  if (!resp.ok) throw new Error(`Failed to fetch news items: ${resp.status}`);
  return resp.json();
}

export async function fetchNewsItemById(id: string): Promise<NewsItemResponse> {
  const resp = await fetch(`${BASE_URL}/${id}`);
  if (!resp.ok) throw new Error(`Failed to fetch news item ${id}: ${resp.status}`);
  return resp.json();
}

export async function createNewsItem(payload: NewsItemCreatePayload): Promise<NewsItemResponse> {
  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create news item: ${resp.status}`);
  return resp.json();
}

export async function updateNewsItem(
  id: string,
  payload: NewsItemUpdatePayload
): Promise<NewsItemResponse> {
  const resp = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update news item ${id}: ${resp.status}`);
  return resp.json();
}
