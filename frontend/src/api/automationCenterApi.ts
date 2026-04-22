/**
 * Automation Center API client.
 *
 * Mirrors backend /api/v1/automation-center/content-projects/{project_id}
 * aggregate surface. One GET, two PATCHes (flow + per-node), one POST
 * /evaluate (no side effects), one POST /run-now (job submission), one
 * POST /nodes/{id}/test (dry-run only).
 *
 * The backend derives node `status` server-side — never trust a client
 * status write. The frontend may set `operation_mode` and `config` only.
 */
import { api } from "./client";

const BASE = "/api/v1/automation-center/content-projects";

// ---------------------------------------------------------------------------
// Types — keep aligned with backend/app/automation_center/schemas.py
// ---------------------------------------------------------------------------

export type NodeStatus =
  | "ready"
  | "warning"
  | "blocked"
  | "disabled"
  | "complete";

export type NodeOperationMode = "manual" | "ai_assist" | "automatic";

export type RunMode = "manual" | "assisted" | "full_auto";

export type PublishPolicy = "draft" | "review" | "scheduled" | "publish";

export type FallbackPolicy = "pause" | "retry" | "skip";

export interface NodeBadge {
  label: string;
  tone: string; // ok | warn | bad | neutral | accent
  detail?: string | null;
}

export interface AutomationNode {
  id: string;
  title: string;
  description?: string | null;
  scope: string;
  operation_mode: NodeOperationMode;
  status: NodeStatus;
  badges: NodeBadge[];
  config: Record<string, unknown>;
  last_run_at?: string | null;
  last_run_outcome?: string | null;
}

export interface AutomationEdge {
  source: string;
  target: string;
  kind: string;
}

export interface AutomationFlowConfig {
  run_mode: RunMode;
  schedule_enabled: boolean;
  cron_expression?: string | null;
  timezone: string;
  require_review_gate: boolean;
  publish_policy: PublishPolicy;
  fallback_on_error: FallbackPolicy;
  max_runs_per_day?: number | null;
  default_template_id?: string | null;
  default_blueprint_id?: string | null;
}

export interface AutomationFlowPatch {
  run_mode?: RunMode;
  schedule_enabled?: boolean;
  cron_expression?: string | null;
  timezone?: string;
  require_review_gate?: boolean;
  publish_policy?: PublishPolicy;
  fallback_on_error?: FallbackPolicy;
  max_runs_per_day?: number | null;
  default_template_id?: string | null;
  default_blueprint_id?: string | null;
}

export interface AutomationNodePatch {
  operation_mode?: NodeOperationMode;
  config?: Record<string, unknown>;
}

export interface ProjectSummary {
  id: string;
  title: string;
  module_type?: string | null;
  user_id: string;
  channel_profile_id: string;
  primary_platform?: string | null;
  content_status: string;
  publish_status: string;
}

export interface AutomationCenterResponse {
  project: ProjectSummary;
  flow: AutomationFlowConfig;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  health: Record<string, unknown>;
  last_evaluated_at: string;
  snapshot_locked: boolean;
}

export interface EvaluateResponse {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  next_run_estimate?: string | null;
}

export interface RunNowRequest {
  dry_run?: boolean;
  force?: boolean;
}

export interface RunNowResponse {
  ok: boolean;
  job_id?: string | null;
  detail?: string | null;
  blockers: string[];
}

export interface NodeTestRequest {
  sample_payload?: Record<string, unknown> | null;
}

export interface NodeTestResponse {
  ok: boolean;
  node_id: string;
  output: Record<string, unknown>;
  issues: string[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchAutomationCenter(
  projectId: string,
): Promise<AutomationCenterResponse> {
  return api.get<AutomationCenterResponse>(`${BASE}/${projectId}`);
}

export function patchAutomationFlow(
  projectId: string,
  payload: AutomationFlowPatch,
): Promise<AutomationCenterResponse> {
  return api.patch<AutomationCenterResponse>(`${BASE}/${projectId}/flow`, payload);
}

export function patchAutomationNode(
  projectId: string,
  nodeId: string,
  payload: AutomationNodePatch,
): Promise<AutomationCenterResponse> {
  return api.patch<AutomationCenterResponse>(
    `${BASE}/${projectId}/nodes/${nodeId}`,
    payload,
  );
}

export function evaluateAutomation(
  projectId: string,
): Promise<EvaluateResponse> {
  return api.post<EvaluateResponse>(`${BASE}/${projectId}/evaluate`, {});
}

export function runAutomationNow(
  projectId: string,
  payload: RunNowRequest = {},
): Promise<RunNowResponse> {
  return api.post<RunNowResponse>(`${BASE}/${projectId}/run-now`, payload);
}

export function testAutomationNode(
  projectId: string,
  nodeId: string,
  payload: NodeTestRequest = {},
): Promise<NodeTestResponse> {
  return api.post<NodeTestResponse>(
    `${BASE}/${projectId}/nodes/${nodeId}/test`,
    payload,
  );
}
