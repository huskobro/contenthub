/**
 * Module Management API client (Phase 2 — Faz A).
 *
 * Endpoints:
 *   GET /api/v1/modules — List all registered modules with enabled status
 *
 * Module enabled toggling delegates to the Settings effective API.
 */

import { api } from "./client";
import { updateSettingAdminValue } from "./effectiveSettingsApi";

const BASE = "/api/v1/modules";

export interface ModuleStep {
  step_key: string;
  step_order: number;
  display_name: string;
  description: string;
  idempotency_type: string;
}

export interface ModuleInfo {
  module_id: string;
  display_name: string;
  enabled: boolean;
  steps: ModuleStep[];
  input_schema: Record<string, unknown>;
  gate_defaults: Record<string, unknown>;
  template_compat: string[];
}

export function fetchModules(): Promise<ModuleInfo[]> {
  return api.get<ModuleInfo[]>(BASE);
}

export function setModuleEnabled(moduleId: string, enabled: boolean): Promise<unknown> {
  return updateSettingAdminValue(`module.${moduleId}.enabled`, enabled);
}
