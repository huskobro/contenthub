const BASE_URL = "/api/v1/used-news";

export interface UsedNewsResponse {
  id: string;
  news_item_id: string;
  usage_type: string;
  usage_context: string | null;
  target_module: string;
  target_entity_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  has_news_item_source: boolean;
  has_news_item_scan_reference: boolean;
}

export async function fetchUsedNews(): Promise<UsedNewsResponse[]> {
  const resp = await fetch(BASE_URL);
  if (!resp.ok) throw new Error(`Failed to fetch used news: ${resp.status}`);
  return resp.json();
}

export async function fetchUsedNewsById(id: string): Promise<UsedNewsResponse> {
  const resp = await fetch(`${BASE_URL}/${id}`);
  if (!resp.ok) throw new Error(`Failed to fetch used news ${id}: ${resp.status}`);
  return resp.json();
}

export interface UsedNewsCreatePayload {
  news_item_id: string;
  usage_type: string;
  target_module: string;
  usage_context?: string | null;
  target_entity_id?: string | null;
  notes?: string | null;
}

export interface UsedNewsUpdatePayload {
  usage_type?: string;
  usage_context?: string | null;
  target_module?: string;
  target_entity_id?: string | null;
  notes?: string | null;
}

export async function createUsedNews(payload: UsedNewsCreatePayload): Promise<UsedNewsResponse> {
  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create used news: ${resp.status}`);
  return resp.json();
}

export async function updateUsedNews(id: string, payload: UsedNewsUpdatePayload): Promise<UsedNewsResponse> {
  const resp = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update used news ${id}: ${resp.status}`);
  return resp.json();
}
