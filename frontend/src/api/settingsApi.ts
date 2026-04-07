import { api } from "./client";

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

export function fetchSettings(): Promise<SettingResponse[]> {
  return api.get<SettingResponse[]>(BASE_URL);
}

export function fetchSettingById(id: string): Promise<SettingResponse> {
  return api.get<SettingResponse>(`${BASE_URL}/${id}`);
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

export function createSetting(payload: SettingCreatePayload): Promise<SettingResponse> {
  return api.post<SettingResponse>(BASE_URL, payload);
}

// M40a: PATCH governance fields
export interface SettingPatchPayload {
  user_override_allowed?: boolean;
  visible_to_user?: boolean;
  visible_in_wizard?: boolean;
  read_only_for_user?: boolean;
}

export function patchSetting(id: string, payload: SettingPatchPayload): Promise<SettingResponse> {
  return api.patch<SettingResponse>(`${BASE_URL}/${id}`, payload);
}
