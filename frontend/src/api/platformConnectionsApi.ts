/**
 * Platform Connections API — Faz 11 + Faz 17 (Connection Center).
 *
 * CRUD + publish-oriented connection matching + Connection Center.
 */

import { api } from "./client";

const BASE = "/api/v1/platform-connections";
const PUBLISH_BASE = "/api/v1/publish";

// ---------------------------------------------------------------------------
// Types (Faz 2/11 — preserved)
// ---------------------------------------------------------------------------

export interface PlatformConnectionResponse {
  id: string;
  channel_profile_id: string;
  platform: string;
  external_account_id: string | null;
  external_account_name: string | null;
  external_avatar_url: string | null;
  auth_state: string;
  token_state: string;
  scopes_granted: string | null;
  scopes_required: string | null;
  scope_status: string;
  features_available: string | null;
  connection_status: string;
  requires_reauth: boolean;
  sync_status: string;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  is_primary: boolean;
  subscriber_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionForPublish {
  id: string;
  channel_profile_id: string;
  platform: string;
  external_account_name: string | null;
  external_account_id: string | null;
  connection_status: string;
  auth_state: string;
  token_state: string;
  scope_status: string;
  is_primary: boolean;
  can_publish: boolean;
}

// ---------------------------------------------------------------------------
// Faz 17 — Connection Center types
// ---------------------------------------------------------------------------

export interface HealthSummary {
  health_level: string;
  supported_count: number;
  blocked_count: number;
  total_applicable: number;
  issues: string[];
  capability_matrix: Record<string, string>;
}

export interface ConnectionWithHealth extends PlatformConnectionResponse {
  health: HealthSummary;
  channel_profile_name: string | null;
  user_id: string | null;
  user_display_name: string | null;
}

export interface ConnectionHealthKPIs {
  total: number;
  healthy: number;
  partial: number;
  disconnected: number;
  reauth_required: number;
  token_issue: number;
  can_publish_ok: number;
  can_read_comments_ok: number;
  can_reply_comments_ok: number;
  can_read_playlists_ok: number;
  can_write_playlists_ok: number;
  can_create_posts_ok: number;
  can_read_analytics_ok: number;
  can_sync_channel_info_ok: number;
}

export interface ConnectionCenterListResponse {
  items: ConnectionWithHealth[];
  total: number;
  kpis: ConnectionHealthKPIs | null;
}

export type CapabilityMatrix = Record<string, string>;

// ---------------------------------------------------------------------------
// API functions (Faz 2/11 — preserved)
// ---------------------------------------------------------------------------

export function fetchPlatformConnections(
  channelProfileId?: string,
): Promise<PlatformConnectionResponse[]> {
  return api.get<PlatformConnectionResponse[]>(
    BASE,
    channelProfileId ? { channel_profile_id: channelProfileId } : undefined,
  );
}

export function fetchConnectionsForPublish(
  channelProfileId: string,
  platform?: string,
): Promise<ConnectionForPublish[]> {
  const params: Record<string, string> = {};
  if (platform) params.platform = platform;
  return api.get<ConnectionForPublish[]>(
    `${PUBLISH_BASE}/connections-for-channel/${channelProfileId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );
}

// ---------------------------------------------------------------------------
// Faz 17 — Connection Center API functions
// ---------------------------------------------------------------------------

export function fetchMyConnections(params?: {
  platform?: string;
  health_level?: string;
  skip?: number;
  limit?: number;
}): Promise<ConnectionCenterListResponse> {
  return api.get<ConnectionCenterListResponse>(`${BASE}/center/my`, params);
}

export function fetchAdminConnections(params?: {
  user_id?: string;
  channel_profile_id?: string;
  platform?: string;
  health_level?: string;
  requires_reauth?: boolean;
  skip?: number;
  limit?: number;
}): Promise<ConnectionCenterListResponse> {
  return api.get<ConnectionCenterListResponse>(`${BASE}/center/admin`, params);
}

export function fetchConnectionHealth(
  connectionId: string,
): Promise<ConnectionWithHealth> {
  return api.get<ConnectionWithHealth>(`${BASE}/${connectionId}/health`);
}

export function fetchConnectionCapability(
  connectionId: string,
): Promise<CapabilityMatrix> {
  return api.get<CapabilityMatrix>(`${BASE}/${connectionId}/capability`);
}
