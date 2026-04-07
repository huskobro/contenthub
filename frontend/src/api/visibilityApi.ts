import { api } from "./client";

const BASE_URL = "/api/v1/visibility-rules";

export interface VisibilityRuleResponse {
  id: string;
  rule_type: string;
  target_key: string;
  module_scope: string | null;
  role_scope: string | null;
  mode_scope: string | null;
  visible: boolean;
  read_only: boolean;
  wizard_visible: boolean;
  status: string;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function fetchVisibilityRules(): Promise<VisibilityRuleResponse[]> {
  return api.get<VisibilityRuleResponse[]>(BASE_URL);
}

export function fetchVisibilityRuleById(id: string): Promise<VisibilityRuleResponse> {
  return api.get<VisibilityRuleResponse>(`${BASE_URL}/${id}`);
}

export interface VisibilityResolution {
  visible: boolean;
  read_only: boolean;
  wizard_visible: boolean;
}

/**
 * Resolve visibility for a target key.
 *
 * M22-A: Hata durumunda artik sessiz permissive fallback donmuyor.
 * Error propagation yapilir -- cagiran (useVisibility hook) hata durumunu yonetir.
 *
 * Bu degisikligin gerekcesi:
 *   Eski davranis: API hatasi -> { visible: true } -> guvenlik acigi
 *   Yeni davranis: API hatasi -> throw -> hook error state -> kontrollu fallback
 */
export function resolveVisibility(
  targetKey: string,
  params?: { role?: string; mode?: string; module_scope?: string },
): Promise<VisibilityResolution> {
  return api.get<VisibilityResolution>(`${BASE_URL}/resolve`, {
    target_key: targetKey,
    ...params,
  });
}

export function deleteVisibilityRule(id: string): Promise<VisibilityRuleResponse> {
  return api.delete<VisibilityRuleResponse>(`${BASE_URL}/${id}`);
}

export interface VisibilityRuleCreate {
  rule_type: string;
  target_key: string;
  module_scope?: string | null;
  role_scope?: string | null;
  mode_scope?: string | null;
  visible?: boolean;
  read_only?: boolean;
  wizard_visible?: boolean;
  status?: string;
  priority?: number;
  notes?: string | null;
}

export interface VisibilityRulePatch {
  visible?: boolean;
  read_only?: boolean;
  wizard_visible?: boolean;
  status?: string;
  priority?: number;
  notes?: string | null;
}

export function createVisibilityRule(payload: VisibilityRuleCreate): Promise<VisibilityRuleResponse> {
  return api.post<VisibilityRuleResponse>(BASE_URL, payload);
}

export function patchVisibilityRule(id: string, payload: VisibilityRulePatch): Promise<VisibilityRuleResponse> {
  return api.patch<VisibilityRuleResponse>(`${BASE_URL}/${id}`, payload);
}
