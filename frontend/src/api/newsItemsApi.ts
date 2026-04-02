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
