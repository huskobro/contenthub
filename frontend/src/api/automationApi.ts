import { api } from "./client";

const POLICY_BASE = "/api/v1/automation-policies";
const INBOX_BASE = "/api/v1/operations-inbox";

// ---------------------------------------------------------------------------
// AutomationPolicy types
// ---------------------------------------------------------------------------

export type CheckpointMode = "disabled" | "manual_review" | "automatic";

export interface AutomationPolicyResponse {
  id: string;
  channel_profile_id: string;
  owner_user_id: string | null;
  name: string;
  is_enabled: boolean;
  source_scan_mode: CheckpointMode;
  draft_generation_mode: CheckpointMode;
  render_mode: CheckpointMode;
  publish_mode: CheckpointMode;
  post_publish_mode: CheckpointMode;
  max_daily_posts: number | null;
  publish_windows_json: string | null;
  platform_rules_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationPolicyCreate {
  channel_profile_id: string;
  owner_user_id?: string;
  name?: string;
  is_enabled?: boolean;
  source_scan_mode?: CheckpointMode;
  draft_generation_mode?: CheckpointMode;
  render_mode?: CheckpointMode;
  publish_mode?: CheckpointMode;
  post_publish_mode?: CheckpointMode;
  max_daily_posts?: number;
  publish_windows_json?: string;
  platform_rules_json?: string;
}

export interface AutomationPolicyUpdate {
  name?: string;
  is_enabled?: boolean;
  source_scan_mode?: CheckpointMode;
  draft_generation_mode?: CheckpointMode;
  render_mode?: CheckpointMode;
  publish_mode?: CheckpointMode;
  post_publish_mode?: CheckpointMode;
  max_daily_posts?: number;
  publish_windows_json?: string;
  platform_rules_json?: string;
}

export interface CheckpointDecision {
  checkpoint: string;
  mode: string;
  should_proceed: boolean;
  requires_review: boolean;
  reason: string;
}

// ---------------------------------------------------------------------------
// AutomationPolicy API calls
// ---------------------------------------------------------------------------

export function fetchAutomationPolicies(params?: {
  channel_profile_id?: string;
  owner_user_id?: string;
}): Promise<AutomationPolicyResponse[]> {
  return api.get<AutomationPolicyResponse[]>(POLICY_BASE, params);
}

export function fetchPolicyForChannel(
  channelProfileId: string,
): Promise<AutomationPolicyResponse> {
  return api.get<AutomationPolicyResponse>(
    `${POLICY_BASE}/by-channel/${channelProfileId}`,
  );
}

export function fetchAutomationPolicy(
  id: string,
): Promise<AutomationPolicyResponse> {
  return api.get<AutomationPolicyResponse>(`${POLICY_BASE}/${id}`);
}

export function createAutomationPolicy(
  payload: AutomationPolicyCreate,
): Promise<AutomationPolicyResponse> {
  return api.post<AutomationPolicyResponse>(POLICY_BASE, payload);
}

export function updateAutomationPolicy(
  id: string,
  payload: AutomationPolicyUpdate,
): Promise<AutomationPolicyResponse> {
  return api.patch<AutomationPolicyResponse>(`${POLICY_BASE}/${id}`, payload);
}

export function evaluatePolicyCheckpoints(
  id: string,
): Promise<CheckpointDecision[]> {
  return api.get<CheckpointDecision[]>(`${POLICY_BASE}/${id}/evaluate`);
}

// ---------------------------------------------------------------------------
// Operations Inbox types
// ---------------------------------------------------------------------------

export interface InboxItemResponse {
  id: string;
  item_type: string;
  channel_profile_id: string | null;
  owner_user_id: string | null;
  related_project_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  title: string;
  reason: string | null;
  status: string;
  priority: string;
  action_url: string | null;
  metadata_json: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxItemCreate {
  item_type: string;
  channel_profile_id?: string;
  owner_user_id?: string;
  related_project_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  title: string;
  reason?: string;
  priority?: string;
  action_url?: string;
  metadata_json?: string;
}

export interface InboxItemUpdate {
  status?: string;
  priority?: string;
}

// ---------------------------------------------------------------------------
// Operations Inbox API calls
// ---------------------------------------------------------------------------

export function fetchInboxItems(params?: {
  owner_user_id?: string;
  channel_profile_id?: string;
  status?: string;
  item_type?: string;
  limit?: number;
}): Promise<InboxItemResponse[]> {
  return api.get<InboxItemResponse[]>(INBOX_BASE, params);
}

export function fetchInboxCount(params?: {
  owner_user_id?: string;
}): Promise<{ count: number }> {
  return api.get<{ count: number }>(`${INBOX_BASE}/count`, params);
}

export function fetchInboxItem(id: string): Promise<InboxItemResponse> {
  return api.get<InboxItemResponse>(`${INBOX_BASE}/${id}`);
}

export function createInboxItem(
  payload: InboxItemCreate,
): Promise<InboxItemResponse> {
  return api.post<InboxItemResponse>(INBOX_BASE, payload);
}

export function updateInboxItem(
  id: string,
  payload: InboxItemUpdate,
): Promise<InboxItemResponse> {
  return api.patch<InboxItemResponse>(`${INBOX_BASE}/${id}`, payload);
}
