import { api } from "./client";

const BASE_URL = "/api/v1/content-library";

export interface ContentLibraryItem {
  id: string;
  content_type: "standard_video" | "news_bulletin";
  title: string | null;
  topic: string;
  status: string;
  created_at: string;
  has_script: boolean;
  has_metadata: boolean;
}

export interface ContentLibraryResponse {
  total: number;
  offset: number;
  limit: number;
  items: ContentLibraryItem[];
}

export interface ContentLibraryParams {
  content_type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function fetchContentLibrary(
  params?: ContentLibraryParams
): Promise<ContentLibraryResponse> {
  return api.get<ContentLibraryResponse>(BASE_URL, params);
}

// ── Clone operations ─────────────────────────────────────────

export function cloneStandardVideo(itemId: string): Promise<unknown> {
  return api.post<unknown>(`/api/v1/modules/standard-video/${itemId}/clone`);
}

export function cloneNewsBulletin(itemId: string): Promise<unknown> {
  return api.post<unknown>(`/api/v1/modules/news-bulletin/${itemId}/clone`);
}
