import { api } from "./client";

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
  has_target_resolved: boolean;
}

export function fetchUsedNews(): Promise<UsedNewsResponse[]> {
  return api.get<UsedNewsResponse[]>(BASE_URL);
}

export function fetchUsedNewsById(id: string): Promise<UsedNewsResponse> {
  return api.get<UsedNewsResponse>(`${BASE_URL}/${id}`);
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

export function createUsedNews(payload: UsedNewsCreatePayload): Promise<UsedNewsResponse> {
  return api.post<UsedNewsResponse>(BASE_URL, payload);
}

export function updateUsedNews(id: string, payload: UsedNewsUpdatePayload): Promise<UsedNewsResponse> {
  return api.patch<UsedNewsResponse>(`${BASE_URL}/${id}`, payload);
}
