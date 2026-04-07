import { api } from "./client";

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  readable: boolean;
}

export interface BrowseResponse {
  current_path: string;
  parent_path: string | null;
  entries: DirEntry[];
}

export interface ValidateResponse {
  valid: boolean;
  path?: string;
  created?: boolean;
  reason?: string;
}

const BASE = "/api/v1/fs";

export function browseDirectory(path?: string): Promise<BrowseResponse> {
  const params = path ? `?path=${encodeURIComponent(path)}` : "";
  return api.get<BrowseResponse>(`${BASE}/browse${params}`);
}

export function validatePath(path: string): Promise<ValidateResponse> {
  return api.get<ValidateResponse>(`${BASE}/validate?path=${encodeURIComponent(path)}`);
}
