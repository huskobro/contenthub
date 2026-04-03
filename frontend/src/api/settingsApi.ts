const BASE_URL = "/api/v1/settings";

export interface SettingResponse {
  id: string;
  key: string;
  group_name: string;
  type: string;
  default_value_json: string;
  admin_value_json: string;
  user_override_allowed: boolean;
  visible_to_user: boolean;
  visible_in_wizard: boolean;
  read_only_for_user: boolean;
  module_scope: string | null;
  help_text: string | null;
  validation_rules_json: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export async function fetchSettings(): Promise<SettingResponse[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch settings: ${res.status}`);
  }
  return res.json();
}

export async function fetchSettingById(id: string): Promise<SettingResponse> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch setting ${id}: ${res.status}`);
  }
  return res.json();
}

export interface SettingCreatePayload {
  key: string;
  group_name?: string;
  type?: string;
  default_value_json?: string;
  admin_value_json?: string;
  user_override_allowed?: boolean;
  visible_to_user?: boolean;
  visible_in_wizard?: boolean;
  read_only_for_user?: boolean;
  module_scope?: string | null;
  help_text?: string | null;
  validation_rules_json?: string;
  status?: string;
}

export async function createSetting(payload: SettingCreatePayload): Promise<SettingResponse> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.[0]?.msg ?? err?.detail ?? `Failed to create setting: ${res.status}`);
  }
  return res.json();
}
