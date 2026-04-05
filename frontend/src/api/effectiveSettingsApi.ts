/**
 * Effective Settings API client — M10-D.
 *
 * Endpoints:
 *   GET  /settings/effective        — all known settings with effective values
 *   GET  /settings/effective/{key}  — single setting explain
 *   GET  /settings/groups           — group summary
 *   PUT  /settings/effective/{key}  — update admin_value
 */

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

export async function fetchEffectiveSettings(params?: {
  group?: string;
  wired_only?: boolean;
}): Promise<EffectiveSetting[]> {
  const qs = new URLSearchParams();
  if (params?.group) qs.set("group", params.group);
  if (params?.wired_only) qs.set("wired_only", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`${BASE}/effective${suffix}`);
  if (!res.ok) throw new Error(`Failed to fetch effective settings: ${res.status}`);
  return res.json();
}

export async function fetchEffectiveSetting(key: string): Promise<EffectiveSetting> {
  const res = await fetch(`${BASE}/effective/${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`Failed to fetch setting ${key}: ${res.status}`);
  return res.json();
}

export async function fetchGroups(): Promise<GroupSummary[]> {
  const res = await fetch(`${BASE}/groups`);
  if (!res.ok) throw new Error(`Failed to fetch groups: ${res.status}`);
  return res.json();
}

export async function updateSettingAdminValue(
  key: string,
  value: unknown,
): Promise<EffectiveSetting> {
  const res = await fetch(`${BASE}/effective/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `Failed to update setting: ${res.status}`);
  }
  return res.json();
}
