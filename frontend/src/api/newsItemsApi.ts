import { api } from "./client";

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
  source_scan_status?: string | null;
  has_published_used_news_link?: boolean;
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

export function fetchNewsItems(
  params?: { status?: string; language?: string; source_id?: string; category?: string; search?: string; limit?: number },
): Promise<NewsItemResponse[]> {
  // Backend `{items, total, offset, limit}` döner; tüm tüketiciler düz dizi bekliyor.
  return api
    .get<{ items: NewsItemResponse[] } | NewsItemResponse[]>(BASE_URL, params)
    .then((r) => (Array.isArray(r) ? r : (r?.items ?? [])));
}

export function fetchNewsItemById(id: string): Promise<NewsItemResponse> {
  return api.get<NewsItemResponse>(`${BASE_URL}/${id}`);
}

export function createNewsItem(payload: NewsItemCreatePayload): Promise<NewsItemResponse> {
  return api.post<NewsItemResponse>(BASE_URL, payload);
}

export function updateNewsItem(
  id: string,
  payload: NewsItemUpdatePayload
): Promise<NewsItemResponse> {
  return api.patch<NewsItemResponse>(`${BASE_URL}/${id}`, payload);
}

/**
 * Arşiv aksiyonu — status=ignored. Audit-loglu, idempotent.
 * Backend: POST /api/v1/news-items/{id}/ignore
 */
export function ignoreNewsItem(id: string): Promise<NewsItemResponse> {
  return api.post<NewsItemResponse>(`${BASE_URL}/${id}/ignore`, {});
}

/**
 * Kullanım aksiyonu (audit-log varyantı) — status=used + news_item.use audit.
 * Genel durumda updateNewsItem({status: "used"}) tercih edilir çünkü tek
 * sorumluluk (status update) daha nettir. Bu endpoint audit trail gerekli
 * olduğunda kullanılır.
 * Backend: POST /api/v1/news-items/{id}/use
 */
export function useNewsItemAction(id: string): Promise<NewsItemResponse> {
  return api.post<NewsItemResponse>(`${BASE_URL}/${id}/use`, {});
}
