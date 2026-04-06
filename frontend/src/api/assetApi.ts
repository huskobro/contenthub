import { api } from "./client";

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

export function fetchAssets(params?: AssetListParams): Promise<AssetListResponse> {
  return api.get<AssetListResponse>(BASE_URL, params);
}

export function fetchAssetById(assetId: string): Promise<AssetItem> {
  return api.get<AssetItem>(`${BASE_URL}/${assetId}`);
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

export function refreshAssets(): Promise<AssetRefreshResponse> {
  return api.post<AssetRefreshResponse>(`${BASE_URL}/refresh`);
}

export function deleteAsset(assetId: string): Promise<AssetDeleteResponse> {
  return api.delete<AssetDeleteResponse>(`${BASE_URL}/${assetId}`);
}

export function revealAsset(assetId: string): Promise<AssetRevealResponse> {
  return api.post<AssetRevealResponse>(`${BASE_URL}/${assetId}/reveal`);
}

export function fetchAllowedActions(assetId: string): Promise<AssetAllowedActionsResponse> {
  return api.get<AssetAllowedActionsResponse>(`${BASE_URL}/${assetId}/allowed-actions`);
}

// ── M21-A: Upload ───────────────────────────────────────────

export interface AssetUploadResponse {
  status: string;
  asset_id: string;
  name: string;
  asset_type: string;
  size_bytes: number;
  message: string;
}

export function uploadAsset(
  file: File,
  assetType?: string
): Promise<AssetUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (assetType) formData.append("asset_type", assetType);
  return api.upload<AssetUploadResponse>(`${BASE_URL}/upload`, formData);
}
