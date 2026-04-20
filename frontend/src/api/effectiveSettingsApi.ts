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
  source: "admin" | "default" | "env" | "builtin" | "missing" | "user_override";
  type: string;
  is_secret: boolean;
  group: string;
  label: string;
  help_text: string;
  module_scope: string | null;
  /** Geriye donuk uyumluluk: backend tarafinda her ayar wired (kayitsiz ayar yok), bu alan daimi `true`. */
  wired: boolean;
  /** Bu ayari runtime'da tuketen modul / executor referansi (ornegin "BulletinScriptExecutor"). */
  wired_to: string;
  builtin_default: unknown;
  env_var: string;
  has_admin_override: boolean;
  has_db_row: boolean;
  db_version: number | null;
  updated_at: string | null;
  // M40: user override and governance fields
  has_user_override?: boolean;
  user_override_value?: unknown;
  user_override_allowed?: boolean;
  visible_to_user?: boolean;
  read_only_for_user?: boolean;
  visible_in_wizard?: boolean;
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
