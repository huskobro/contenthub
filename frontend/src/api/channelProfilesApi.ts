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

// Branding Center URL onboarding — preview/confirm pair.
export interface ChannelImportPreviewRequest {
  source_url: string;
}

export interface ChannelImportPreview {
  preview_token: string;
  platform?: string | null;
  source_url: string;
  normalized_url: string;
  url_kind?: string | null;
  external_channel_id?: string | null;
  handle?: string | null;
  title?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  is_partial: boolean;
  fetch_error?: string | null;
  expires_in_seconds: number;
}

export interface ChannelImportConfirmRequest {
  preview_token: string;
  source_url: string;
  default_language?: string;
  notes?: string;
  profile_name?: string;
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

// Branding Center onboarding — Step 1: preview (no DB row, returns signed token).
export function previewChannelImport(
  data: ChannelImportPreviewRequest,
): Promise<ChannelImportPreview> {
  return api.post<ChannelImportPreview>(`${BASE}/import-preview`, data);
}

// Branding Center onboarding — Step 2: confirm with token + URL.
export function confirmChannelImport(
  data: ChannelImportConfirmRequest,
): Promise<ChannelProfileResponse> {
  return api.post<ChannelProfileResponse>(`${BASE}/import-confirm`, data);
}

export function deleteChannelProfile(
  profileId: string,
): Promise<ChannelProfileResponse> {
  return api.delete<ChannelProfileResponse>(`${BASE}/${profileId}`);
}

/**
 * PATCH a channel profile. Backend `ChannelProfileUpdate` accepts partial
 * fields; `status` is constrained to `"active" | "archived"`. Used here for
 * unarchive (status → "active"); the same endpoint can be reused for any
 * future inline edit.
 */
export interface UpdateChannelProfilePayload {
  status?: "active" | "archived";
  profile_name?: string;
  default_language?: string;
  notes?: string | null;
  title?: string;
  handle?: string;
  avatar_url?: string;
}

export function updateChannelProfile(
  profileId: string,
  payload: UpdateChannelProfilePayload,
): Promise<ChannelProfileResponse> {
  return api.patch<ChannelProfileResponse>(`${BASE}/${profileId}`, payload);
}

/**
 * PHASE AD / PHASE AF — reimport channel metadata (re-run URL fetch).
 *
 * Use when `import_status === "partial"` or `"failed"` so the user can
 * retry the metadata pull without manual field entry. User-edit fields
 * (profile_name, notes, default_language) are preserved.
 */
export function reimportChannelProfile(
  profileId: string,
): Promise<ChannelProfileResponse> {
  return api.post<ChannelProfileResponse>(`${BASE}/${profileId}/reimport`);
}
