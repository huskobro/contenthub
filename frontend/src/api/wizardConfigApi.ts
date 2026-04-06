import { api } from "./client";

const BASE_URL = "/api/v1/wizard-configs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WizardStepFieldConfig {
  field_key: string;
  label: string;
  field_type: string;
  required: boolean;
  visible: boolean;
  admin_hideable: boolean;
  auto_suggest: boolean;
  preview_enabled: boolean;
  default_value: unknown;
  options: string[] | null;
  help_text: string | null;
  writes_to_backend: boolean;
  affects_snapshot: boolean;
  affects_pipeline: boolean;
}

export interface WizardStepConfig {
  step_key: string;
  label: string;
  order: number;
  enabled: boolean;
  fields: WizardStepFieldConfig[];
}

export interface WizardConfigResponse {
  id: string;
  wizard_type: string;
  display_name: string;
  enabled: boolean;
  steps_config: WizardStepConfig[];
  field_defaults: Record<string, unknown> | null;
  module_scope: string | null;
  status: string;
  version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WizardConfigUpdatePayload {
  display_name?: string;
  enabled?: boolean;
  steps_config?: WizardStepConfig[];
  field_defaults?: Record<string, unknown> | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchWizardConfigs(): Promise<WizardConfigResponse[]> {
  return api.get<WizardConfigResponse[]>(BASE_URL);
}

export function fetchWizardConfigByType(wizardType: string): Promise<WizardConfigResponse | null> {
  return api.getOrNull<WizardConfigResponse>(`${BASE_URL}/by-type/${wizardType}`);
}

export function fetchWizardConfigById(id: string): Promise<WizardConfigResponse> {
  return api.get<WizardConfigResponse>(`${BASE_URL}/${id}`);
}

export function updateWizardConfig(
  id: string,
  payload: WizardConfigUpdatePayload,
): Promise<WizardConfigResponse> {
  return api.patch<WizardConfigResponse>(`${BASE_URL}/${id}`, payload);
}
