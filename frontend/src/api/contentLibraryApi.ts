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

export async function fetchContentLibrary(
  params?: ContentLibraryParams
): Promise<ContentLibraryResponse> {
  const url = new URL(BASE_URL, globalThis.location?.origin ?? "http://localhost");
  if (params?.content_type) url.searchParams.set("content_type", params.content_type);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.limit !== undefined) url.searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) url.searchParams.set("offset", String(params.offset));
  const res = await fetch(url.pathname + url.search);
  if (!res.ok) throw new Error(`Failed to fetch content library: ${res.status}`);
  return res.json();
}

// ── Clone operations ─────────────────────────────────────────

export async function cloneStandardVideo(itemId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/modules/standard-video/${itemId}/clone`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to clone standard video: ${res.status}`);
  return res.json();
}

export async function cloneNewsBulletin(itemId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/modules/news-bulletin/${itemId}/clone`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to clone news bulletin: ${res.status}`);
  return res.json();
}
