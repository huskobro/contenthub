/**
 * Effective Settings API client — M10-D.
 *
 * Endpoints:
 *   GET  /settings/effective        — all known settings with effective values
 *   GET  /settings/effective/{key}  — single setting explain
 *   GET  /settings/groups           — group summary
 *   PUT  /settings/effective/{key}  — update admin_value
 */

import { api } from "./client";

const BASE = "/api/v1/settings";

export interface EffectiveSetting {
  key: string;
  effective_value: unknown;
  source: "admin" | "default" | "env" | "builtin" | "missing";
  type: string;
  is_secret: boolean;
  group: string;
  label: string;
  help_text: string;
  module_scope: string | null;
  wired: boolean;
  wired_to: string;
  builtin_default: unknown;
  env_var: string;
  has_admin_override: boolean;
  has_db_row: boolean;
  db_version: number | null;
  updated_at: string | null;
}

export interface GroupSummary {
  group: string;
  label: string;
  total: number;
  wired: number;
  secret: number;
  missing: number;
}

export function fetchEffectiveSettings(params?: {
  group?: string;
  wired_only?: boolean;
}): Promise<EffectiveSetting[]> {
  return api.get<EffectiveSetting[]>(`${BASE}/effective`, params);
}

export function fetchEffectiveSetting(key: string): Promise<EffectiveSetting> {
  return api.get<EffectiveSetting>(`${BASE}/effective/${encodeURIComponent(key)}`);
}

export function fetchGroups(): Promise<GroupSummary[]> {
  return api.get<GroupSummary[]>(`${BASE}/groups`);
}

export function updateSettingAdminValue(
  key: string,
  value: unknown,
): Promise<EffectiveSetting> {
  return api.put<EffectiveSetting>(`${BASE}/effective/${encodeURIComponent(key)}`, { value });
}
