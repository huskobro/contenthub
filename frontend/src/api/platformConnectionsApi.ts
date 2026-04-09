/**
 * Platform Connections API — Faz 11.
 *
 * CRUD + publish-oriented connection matching.
 */

import { api } from "./client";

const BASE = "/api/v1/platform-connections";
const PUBLISH_BASE = "/api/v1/publish";

// ---------------------------------------------------------------------------
// Types
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
// API functions
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
