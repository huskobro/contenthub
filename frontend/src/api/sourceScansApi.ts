import { api } from "./client";

const BASE_URL = "/api/v1/source-scans";

export interface SourceScanResponse {
  id: string;
  source_id: string;
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
  reviewed_news_count_from_scan?: number;
  used_news_count_from_scan?: number;
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
}): Promise<SourceScanResponse[]> {
  return api.get<SourceScanResponse[]>(BASE_URL, params);
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
