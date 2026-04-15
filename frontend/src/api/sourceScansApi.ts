import { api } from "./client";

const BASE_URL = "/api/v1/source-scans";

/**
 * SourceScanResponse — Gate Sources Closure sonrasi:
 *   - scan_mode yalnizca 'manual' | 'auto' alabilir (curated kaldirildi)
 *   - reviewed_news_count_from_scan KALDIRILDI (news_items.status 'reviewed' yok)
 */
export interface SourceScanResponse {
  id: string;
  source_id: string;
  /** 'manual' | 'auto' */
  scan_mode: string;
  status: string;
  requested_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  result_count: number | null;
  error_summary: string | null;
  raw_result_preview_json: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  source_name?: string | null;
  source_status?: string | null;
  linked_news_count_from_scan?: number;
  used_news_count_from_scan?: number;
}

/** Gate Sources Closure pagination envelope. */
export interface SourceScanListResponse {
  items: SourceScanResponse[];
  total: number;
  offset: number;
  limit: number;
}

export interface SourceScanCreatePayload {
  source_id: string;
  scan_mode: string;
  status?: string;
  requested_by?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  result_count?: number | null;
  error_summary?: string | null;
  raw_result_preview_json?: string | null;
  notes?: string | null;
}

export interface SourceScanUpdatePayload {
  status?: string;
  requested_by?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  result_count?: number | null;
  error_summary?: string | null;
  raw_result_preview_json?: string | null;
  notes?: string | null;
}

export function fetchSourceScans(params?: {
  source_id?: string;
  status?: string;
  scan_mode?: string;
  limit?: number;
  offset?: number;
}): Promise<SourceScanListResponse> {
  return api.get<SourceScanListResponse>(BASE_URL, params);
}

export function fetchSourceScanById(scanId: string): Promise<SourceScanResponse> {
  return api.get<SourceScanResponse>(`${BASE_URL}/${scanId}`);
}

export function createSourceScan(
  payload: SourceScanCreatePayload
): Promise<SourceScanResponse> {
  return api.post<SourceScanResponse>(BASE_URL, payload);
}

export function updateSourceScan(
  scanId: string,
  payload: SourceScanUpdatePayload
): Promise<SourceScanResponse> {
  return api.patch<SourceScanResponse>(`${BASE_URL}/${scanId}`, payload);
}

export interface ScanExecuteResponse {
  scan_id: string;
  status: string;
  fetched_count: number;
  new_count: number;
  skipped_dedupe: number;
  skipped_hard: number;
  skipped_soft: number;
  followup_accepted: number;
  skipped_invalid: number;
  error_summary?: string | null;
}

export function executeSourceScan(
  scanId: string,
  allowFollowup = false,
): Promise<ScanExecuteResponse> {
  return api.post<ScanExecuteResponse>(`${BASE_URL}/${scanId}/execute`, {
    allow_followup: allowFollowup,
  });
}

/**
 * Retry a failed scan — creates a new queued scan for the same source and
 * executes it inline. Audit-logged as ``source_scan.retry``. Returns the
 * NEW (retried) scan record, not the original.
 */
export function retrySourceScan(scanId: string): Promise<SourceScanResponse> {
  return api.post<SourceScanResponse>(`${BASE_URL}/${scanId}/retry`, {});
}

/**
 * Scheduler runtime state — effective interval, kill-switch, last tick outcome.
 */
export interface ScanSchedulerStatus {
  enabled: boolean;
  effective_interval_seconds: number;
  last_tick_at: string | null;
  last_tick_ok: boolean | null;
  last_tick_error: string | null;
  last_triggered_count: number;
  skipped_because_disabled: boolean;
}

export function fetchScanSchedulerStatus(): Promise<ScanSchedulerStatus> {
  return api.get<ScanSchedulerStatus>(`${BASE_URL}/scheduler/status`);
}
