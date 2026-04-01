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
