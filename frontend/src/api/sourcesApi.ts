import { api } from "./client";

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
  linked_news_count?: number;
  reviewed_news_count?: number;
  used_news_count_from_source?: number;
}

export function fetchSources(params?: {
  source_type?: string;
  status?: string;
  scan_mode?: string;
}): Promise<SourceResponse[]> {
  return api.get<SourceResponse[]>(BASE_URL, params);
}

export function fetchSourceById(sourceId: string): Promise<SourceResponse> {
  return api.get<SourceResponse>(`${BASE_URL}/${sourceId}`);
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

export function createSource(payload: SourceCreatePayload): Promise<SourceResponse> {
  return api.post<SourceResponse>(BASE_URL, payload);
}

export function updateSource(sourceId: string, payload: SourceUpdatePayload): Promise<SourceResponse> {
  return api.patch<SourceResponse>(`${BASE_URL}/${sourceId}`, payload);
}
