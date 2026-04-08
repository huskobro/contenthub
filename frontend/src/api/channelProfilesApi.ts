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

export function deleteChannelProfile(
  profileId: string,
): Promise<ChannelProfileResponse> {
  return api.delete<ChannelProfileResponse>(`${BASE}/${profileId}`);
}
