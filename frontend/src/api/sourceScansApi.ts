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

export async function fetchSourceScans(params?: {
  source_id?: string;
  status?: string;
  scan_mode?: string;
}): Promise<SourceScanResponse[]> {
  const url = new URL(BASE_URL, window.location.origin);
  if (params?.source_id) url.searchParams.set("source_id", params.source_id);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.scan_mode) url.searchParams.set("scan_mode", params.scan_mode);

  const resp = await fetch(url.pathname + url.search);
  if (!resp.ok) throw new Error(`Failed to fetch source scans: ${resp.status}`);
  return resp.json();
}

export async function fetchSourceScanById(scanId: string): Promise<SourceScanResponse> {
  const resp = await fetch(`${BASE_URL}/${scanId}`);
  if (!resp.ok) throw new Error(`Failed to fetch source scan ${scanId}: ${resp.status}`);
  return resp.json();
}

export async function createSourceScan(
  payload: SourceScanCreatePayload
): Promise<SourceScanResponse> {
  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create source scan: ${resp.status}`);
  return resp.json();
}

export async function updateSourceScan(
  scanId: string,
  payload: SourceScanUpdatePayload
): Promise<SourceScanResponse> {
  const resp = await fetch(`${BASE_URL}/${scanId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update source scan ${scanId}: ${resp.status}`);
  return resp.json();
}
