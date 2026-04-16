/**
 * Channel Profiles API — Faz 4.
 */

import { api } from "./client";

const BASE = "/api/v1/channel-profiles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChannelProfileResponse {
  id: string;
  user_id: string;
  profile_name: string;
  profile_type: string | null;
  channel_slug: string;
  default_language: string;
  default_content_mode: string | null;
  brand_profile_id: string | null;
  automation_policy_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // PHASE X: URL-only create flow metadata (backend dondurur)
  platform?: string | null;
  source_url?: string | null;
  normalized_url?: string | null;
  external_channel_id?: string | null;
  handle?: string | null;
  title?: string | null;
  avatar_url?: string | null;
  /**
   * PHASE X import lifecycle: "pending" | "success" | "partial" | "failed".
   * `partial` means the channel row exists but metadata fetch incomplete —
   * the user should see honest badges and can trigger `/reimport`.
   */
  import_status?: string | null;
  import_error?: string | null;
  last_import_at?: string | null;
}

export interface CreateChannelProfile {
  user_id: string;
  profile_name: string;
  channel_slug: string;
  profile_type?: string;
  default_language?: string;
  default_content_mode?: string;
  notes?: string;
}

// PHASE X: URL-only create payload.
export interface CreateChannelProfileFromURL {
  source_url: string;
  default_language?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchChannelProfiles(
  userId?: string,
): Promise<ChannelProfileResponse[]> {
  return api.get<ChannelProfileResponse[]>(BASE, userId ? { user_id: userId } : undefined);
}

export function fetchChannelProfile(
  profileId: string,
): Promise<ChannelProfileResponse> {
  return api.get<ChannelProfileResponse>(`${BASE}/${profileId}`);
}

export function createChannelProfile(
  data: CreateChannelProfile,
): Promise<ChannelProfileResponse> {
  return api.post<ChannelProfileResponse>(BASE, data);
}

// PHASE X: URL-only create
export function createChannelProfileFromURL(
  data: CreateChannelProfileFromURL,
): Promise<ChannelProfileResponse> {
  return api.post<ChannelProfileResponse>(`${BASE}/from-url`, data);
}

export function deleteChannelProfile(
  profileId: string,
): Promise<ChannelProfileResponse> {
  return api.delete<ChannelProfileResponse>(`${BASE}/${profileId}`);
}
