/**
 * System API — OS-level system info for onboarding and setup screens.
 */

import { api } from "./client";

export interface SystemInfo {
  os_username: string;
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  return api.get<SystemInfo>("/api/v1/system/info");
}
