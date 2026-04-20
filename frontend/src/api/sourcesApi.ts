import { api } from "./client";

const BASE_URL = "/api/v1/sources";

/**
 * SourceResponse — /api/v1/sources/{id} ve listeleme response tipi.
 *
 * Gate Sources Closure notlari:
 *   - source_type artik sadece 'rss' alabilir (backend 422 atar manual_url/api icin)
 *   - scan_mode artik 'manual' | 'auto' (curated kaldirildi)
 *   - reviewed_news_count alani KALDIRILDI — news_items.status 'reviewed' artik yok
 *   - health alanlari (last_scan_error, consecutive_failure_count) eklendi
 */
export interface SourceResponse {
  id: string;
  name: string;
  /** Only 'rss' accepted since Gate Sources Closure. */
  source_type: string;
  status: string;
  base_url: string | null;
  feed_url: string | null;
  api_endpoint: string | null;
  /** low | medium | high — each level produces distinct behavior at bulletin selection. */
  trust_level: string | null;
  /** manual | auto */
  scan_mode: string | null;
  language: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  scan_count?: number;
  last_scan_status?: string | null;
  last_scan_finished_at?: string | null;
  last_scan_error?: string | null;
  consecutive_failure_count?: number;
  linked_news_count?: number;
  used_news_count_from_source?: number;
}

/** Gate Sources Closure pagination envelope. */
export interface SourceListResponse {
  items: SourceResponse[];
  total: number;
  offset: number;
  limit: number;
}

/** Source health detail returned by GET /sources/{id}/health. */
export interface SourceHealthResponse {
  source_id: string;
  name: string;
  status: string;
  scan_count: number;
  last_scan_status: string | null;
  last_scan_finished_at: string | null;
  last_scan_error: string | null;
  consecutive_failure_count: number;
}

export function fetchSources(params?: {
  source_type?: string;
  status?: string;
  scan_mode?: string;
  limit?: number;
  offset?: number;
}): Promise<SourceListResponse> {
  return api.get<SourceListResponse>(BASE_URL, params);
}

export function fetchSourceById(sourceId: string): Promise<SourceResponse> {
  return api.get<SourceResponse>(`${BASE_URL}/${sourceId}`);
}

export function fetchSourceHealth(sourceId: string): Promise<SourceHealthResponse> {
  return api.get<SourceHealthResponse>(`${BASE_URL}/${sourceId}/health`);
}

export interface SourceCreatePayload {
  name: string;
  /** Only 'rss' accepted. */
  source_type: string;
  status?: string;
  base_url?: string;
  feed_url?: string;
  api_endpoint?: string;
  trust_level?: string;
  /** 'manual' | 'auto' */
  scan_mode?: string;
  language?: string;
  category?: string;
  notes?: string;
}

export interface SourceUpdatePayload {
  name?: string;
  /** Only 'rss' accepted — server rejects attempts to change off 'rss'. */
  source_type?: string;
  status?: string;
  base_url?: string;
  feed_url?: string;
  api_endpoint?: string;
  trust_level?: string;
  scan_mode?: string;
  language?: string;
  category?: string;
  notes?: string;
}

export function createSource(payload: SourceCreatePayload): Promise<SourceResponse> {
  return api.post<SourceResponse>(BASE_URL, payload);
}

export function updateSource(sourceId: string, payload: SourceUpdatePayload): Promise<SourceResponse> {
  return api.patch<SourceResponse>(`${BASE_URL}/${sourceId}`, payload);
}

export function deleteSource(sourceId: string): Promise<void> {
  return api.delete<void>(`${BASE_URL}/${sourceId}`);
}

export function bulkDeleteSources(ids: string[]): Promise<void[]> {
  return Promise.all(ids.map((id) => deleteSource(id)));
}

/**
 * Trigger an on-demand scan for a source. Creates a new queued scan,
 * executes it inline, and returns the scan record + result summary.
 * Audit-logged as ``source.trigger_scan``.
 *
 * Pass-6: backend trigger-scan response artik scan ozetini de iceriyor;
 * frontend bunlari toast'a yazarak "tarama basladi" yerine "X yeni haber"
 * durust feedback'i veriyor.
 */
export interface TriggerScanResult {
  scan_id: string;
  source_id: string;
  status: string;
  fetched_count: number;
  new_count: number;
  skipped_dedupe: number;
  error_summary: string | null;
}

export function triggerSourceScan(sourceId: string): Promise<TriggerScanResult> {
  return api.post(`${BASE_URL}/${sourceId}/trigger-scan`, {});
}
