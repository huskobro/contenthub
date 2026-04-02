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
