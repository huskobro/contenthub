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

export async function fetchVisibilityRules(): Promise<VisibilityRuleResponse[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch visibility rules: ${res.status}`);
  }
  return res.json();
}

export async function fetchVisibilityRuleById(id: string): Promise<VisibilityRuleResponse> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch visibility rule ${id}: ${res.status}`);
  }
  return res.json();
}

export interface VisibilityResolution {
  visible: boolean;
  read_only: boolean;
  wizard_visible: boolean;
}

export async function resolveVisibility(
  targetKey: string,
  params?: { role?: string; mode?: string; module_scope?: string },
): Promise<VisibilityResolution> {
  const searchParams = new URLSearchParams({ target_key: targetKey });
  if (params?.role) searchParams.set("role", params.role);
  if (params?.mode) searchParams.set("mode", params.mode);
  if (params?.module_scope) searchParams.set("module_scope", params.module_scope);
  const resp = await fetch(`${BASE_URL}/resolve?${searchParams}`);
  if (!resp.ok) return { visible: true, read_only: false, wizard_visible: false };
  return resp.json();
}
