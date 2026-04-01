const BASE_URL = "/api/v1/style-blueprints";

export interface StyleBlueprintResponse {
  id: string;
  name: string;
  module_scope: string | null;
  status: string;
  version: number;
  visual_rules_json: string | null;
  motion_rules_json: string | null;
  layout_rules_json: string | null;
  subtitle_rules_json: string | null;
  thumbnail_rules_json: string | null;
  preview_strategy_json: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchStyleBlueprints(params?: {
  module_scope?: string;
  status?: string;
}): Promise<StyleBlueprintResponse[]> {
  const url = new URL(BASE_URL, window.location.origin);
  if (params?.module_scope) url.searchParams.set("module_scope", params.module_scope);
  if (params?.status) url.searchParams.set("status", params.status);

  const resp = await fetch(url.pathname + url.search);
  if (!resp.ok) throw new Error(`Failed to fetch style blueprints: ${resp.status}`);
  return resp.json();
}

export async function fetchStyleBlueprintById(blueprintId: string): Promise<StyleBlueprintResponse> {
  const resp = await fetch(`${BASE_URL}/${blueprintId}`);
  if (!resp.ok) throw new Error(`Failed to fetch style blueprint ${blueprintId}: ${resp.status}`);
  return resp.json();
}
