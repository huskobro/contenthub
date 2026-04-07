import { api } from "./client";

const BASE = "/api/v1/prompt-assembly";

// ── Types ──

export interface PromptBlockResponse {
  id: string;
  key: string;
  title: string;
  module_scope: string | null;
  provider_scope: string | null;
  group_name: string;
  kind: string;
  order_index: number;
  enabled_by_default: boolean;
  condition_type: string;
  condition_config_json: string | null;
  content_template: string;
  admin_override_template: string | null;
  effective_template: string;
  help_text: string | null;
  visible_in_admin: boolean;
  status: string;
  version: number;
  source_kind: string;
  created_at: string;
  updated_at: string;
}

export interface PromptBlockUpdatePayload {
  title?: string;
  admin_override_template?: string | null;
  status?: string;
  order_index?: number;
  enabled_by_default?: boolean;
  help_text?: string;
}

export interface BlockTraceResponse {
  block_key: string;
  block_title: string;
  block_kind: string;
  order_index: number;
  included: boolean;
  reason_code: string;
  reason_text: string;
  evaluated_condition_type: string;
  evaluated_condition_key: string | null;
  evaluated_condition_value: string | null;
  rendered_text: string | null;
  used_variables_json: string | null;
  missing_variables_json: string | null;
}

export interface AssemblyPreviewRequest {
  module_scope: string;
  step_key?: string;
  provider_name?: string;
  data_overrides?: Record<string, unknown>;
  settings_overrides?: Record<string, unknown>;
  user_content?: string;
}

export interface AssemblyPreviewResponse {
  assembly_run_id: string;
  is_dry_run: boolean;
  data_source: string;
  final_prompt_text: string;
  final_payload: Record<string, unknown>;
  included_blocks: BlockTraceResponse[];
  skipped_blocks: BlockTraceResponse[];
  settings_snapshot_summary: Record<string, unknown>;
  data_snapshot_summary: Record<string, unknown>;
}

export interface AssemblyRunResponse {
  id: string;
  job_id: string | null;
  step_key: string | null;
  module_scope: string;
  provider_name: string;
  provider_type: string;
  final_prompt_text: string;
  final_payload_json: string;
  provider_response_json: string | null;
  provider_error_json: string | null;
  included_block_keys_json: string;
  skipped_block_keys_json: string;
  block_count_included: number;
  block_count_skipped: number;
  is_dry_run: boolean;
  data_source: string;
  created_at: string;
}

export interface AssemblyRunDetailResponse extends AssemblyRunResponse {
  settings_snapshot_json: string;
  prompt_snapshot_json: string;
  data_snapshot_json: string;
  block_traces: BlockTraceResponse[];
}

// ── API calls ──

export function fetchPromptBlocks(
  moduleScope?: string
): Promise<PromptBlockResponse[]> {
  const params = moduleScope ? `?module_scope=${moduleScope}` : "";
  return api.get<PromptBlockResponse[]>(`${BASE}/blocks${params}`);
}

export function fetchPromptBlock(id: string): Promise<PromptBlockResponse> {
  return api.get<PromptBlockResponse>(`${BASE}/blocks/${id}`);
}

export function updatePromptBlock(
  id: string,
  payload: PromptBlockUpdatePayload
): Promise<PromptBlockResponse> {
  return api.patch<PromptBlockResponse>(`${BASE}/blocks/${id}`, payload);
}

export function previewAssembly(
  payload: AssemblyPreviewRequest
): Promise<AssemblyPreviewResponse> {
  return api.post<AssemblyPreviewResponse>(`${BASE}/preview`, payload);
}

export function fetchAssemblyTracesForJob(
  jobId: string
): Promise<AssemblyRunResponse[]> {
  return api.get<AssemblyRunResponse[]>(`${BASE}/traces/job/${jobId}`);
}

export function fetchAssemblyRunDetail(
  runId: string
): Promise<AssemblyRunDetailResponse> {
  return api.get<AssemblyRunDetailResponse>(`${BASE}/traces/${runId}`);
}
