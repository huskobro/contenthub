const BASE_URL = "/api/v1/assets";

export interface AssetItem {
  id: string;
  name: string;
  asset_type: string;
  source_kind: string;
  file_path: string;
  size_bytes: number;
  mime_ext: string;
  job_id: string | null;
  module_type: string | null;
  discovered_at: string | null;
}

export interface AssetListResponse {
  total: number;
  offset: number;
  limit: number;
  items: AssetItem[];
}

export interface AssetListParams {
  asset_type?: string;
  search?: string;
  job_id?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAssets(params?: AssetListParams): Promise<AssetListResponse> {
  const url = new URL(BASE_URL, globalThis.location?.origin ?? "http://localhost");
  if (params?.asset_type) url.searchParams.set("asset_type", params.asset_type);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.job_id) url.searchParams.set("job_id", params.job_id);
  if (params?.limit !== undefined) url.searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) url.searchParams.set("offset", String(params.offset));
  const res = await fetch(url.pathname + url.search);
  if (!res.ok) throw new Error(`Failed to fetch assets: ${res.status}`);
  return res.json();
}

export async function fetchAssetById(assetId: string): Promise<AssetItem> {
  const res = await fetch(`${BASE_URL}/${assetId}`);
  if (!res.ok) throw new Error(`Failed to fetch asset ${assetId}: ${res.status}`);
  return res.json();
}

// ── M20-A: Operation interfaces ─────────────────────────────

export interface AssetRefreshResponse {
  status: string;
  total_scanned: number;
  message: string;
}

export interface AssetDeleteResponse {
  status: string;
  asset_id: string;
  message: string;
}

export interface AssetRevealResponse {
  asset_id: string;
  absolute_path: string;
  directory: string;
  exists: boolean;
}

export interface AssetAllowedActionsResponse {
  asset_id: string;
  actions: string[];
}

// ── M20-A: Operation functions ──────────────────────────────

export async function refreshAssets(): Promise<AssetRefreshResponse> {
  const res = await fetch(`${BASE_URL}/refresh`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to refresh assets: ${res.status}`);
  return res.json();
}

export async function deleteAsset(assetId: string): Promise<AssetDeleteResponse> {
  const res = await fetch(`${BASE_URL}/${assetId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Silme hatasi" }));
    throw new Error(body.detail || `Failed to delete asset: ${res.status}`);
  }
  return res.json();
}

export async function revealAsset(assetId: string): Promise<AssetRevealResponse> {
  const res = await fetch(`${BASE_URL}/${assetId}/reveal`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to reveal asset: ${res.status}`);
  return res.json();
}

export async function fetchAllowedActions(assetId: string): Promise<AssetAllowedActionsResponse> {
  const res = await fetch(`${BASE_URL}/${assetId}/allowed-actions`);
  if (!res.ok) throw new Error(`Failed to fetch allowed actions: ${res.status}`);
  return res.json();
}
