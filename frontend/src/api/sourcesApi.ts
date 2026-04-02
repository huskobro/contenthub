const BASE_URL = "/api/v1/sources";

export interface SourceResponse {
  id: string;
  name: string;
  source_type: string;
  status: string;
  base_url: string | null;
  feed_url: string | null;
  api_endpoint: string | null;
  trust_level: string | null;
  scan_mode: string | null;
  language: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  scan_count?: number;
  last_scan_status?: string | null;
  last_scan_finished_at?: string | null;
}

export async function fetchSources(params?: {
  source_type?: string;
  status?: string;
  scan_mode?: string;
}): Promise<SourceResponse[]> {
  const url = new URL(BASE_URL, window.location.origin);
  if (params?.source_type) url.searchParams.set("source_type", params.source_type);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.scan_mode) url.searchParams.set("scan_mode", params.scan_mode);

  const resp = await fetch(url.pathname + url.search);
  if (!resp.ok) throw new Error(`Failed to fetch sources: ${resp.status}`);
  return resp.json();
}

export async function fetchSourceById(sourceId: string): Promise<SourceResponse> {
  const resp = await fetch(`${BASE_URL}/${sourceId}`);
  if (!resp.ok) throw new Error(`Failed to fetch source ${sourceId}: ${resp.status}`);
  return resp.json();
}

export interface SourceCreatePayload {
  name: string;
  source_type: string;
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

export interface SourceUpdatePayload {
  name?: string;
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

export async function createSource(payload: SourceCreatePayload): Promise<SourceResponse> {
  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.detail?.[0]?.msg ?? err?.detail ?? `Failed to create source: ${resp.status}`);
  }
  return resp.json();
}

export async function updateSource(sourceId: string, payload: SourceUpdatePayload): Promise<SourceResponse> {
  const resp = await fetch(`${BASE_URL}/${sourceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.detail?.[0]?.msg ?? err?.detail ?? `Failed to update source: ${resp.status}`);
  }
  return resp.json();
}
