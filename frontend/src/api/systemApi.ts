/**
 * System API — OS-level system info + health for setup/dashboard screens.
 */

import { api } from "./client";

export interface SystemInfo {
  os_username: string;
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  return api.get<SystemInfo>("/api/v1/system/info");
}

export interface SystemHealth {
  status: "ok" | "degraded" | "error";
  app: string;
  python_version: string;
  venv_active: boolean;
  db_connected: boolean;
  db_wal_mode: boolean;
  db_error: string | null;
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  return api.get<SystemHealth>("/api/v1/health");
}
