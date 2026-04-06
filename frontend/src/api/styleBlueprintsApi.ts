import { api } from "./client";

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

export interface StyleBlueprintCreatePayload {
  name: string;
  module_scope?: string | null;
  status?: string;
  version?: number;
  visual_rules_json?: string | null;
  motion_rules_json?: string | null;
  layout_rules_json?: string | null;
  subtitle_rules_json?: string | null;
  thumbnail_rules_json?: string | null;
  preview_strategy_json?: string | null;
  notes?: string | null;
}

export interface StyleBlueprintUpdatePayload {
  name?: string;
  module_scope?: string | null;
  status?: string;
  version?: number;
  visual_rules_json?: string | null;
  motion_rules_json?: string | null;
  layout_rules_json?: string | null;
  subtitle_rules_json?: string | null;
  thumbnail_rules_json?: string | null;
  preview_strategy_json?: string | null;
  notes?: string | null;
}

export function fetchStyleBlueprints(params?: {
  module_scope?: string;
  status?: string;
}): Promise<StyleBlueprintResponse[]> {
  return api.get<StyleBlueprintResponse[]>(BASE_URL, params);
}

export function fetchStyleBlueprintById(blueprintId: string): Promise<StyleBlueprintResponse> {
  return api.get<StyleBlueprintResponse>(`${BASE_URL}/${blueprintId}`);
}

export function createStyleBlueprint(payload: StyleBlueprintCreatePayload): Promise<StyleBlueprintResponse> {
  return api.post<StyleBlueprintResponse>(BASE_URL, payload);
}

export function updateStyleBlueprint(
  blueprintId: string,
  payload: StyleBlueprintUpdatePayload
): Promise<StyleBlueprintResponse> {
  return api.patch<StyleBlueprintResponse>(`${BASE_URL}/${blueprintId}`, payload);
}
