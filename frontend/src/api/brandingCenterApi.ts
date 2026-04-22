/**
 * Branding Center API client.
 *
 * Mirrors backend /api/v1/branding-center/channels/{channel_id} aggregate
 * surface. One GET, five section PATCHes, one POST /apply. The backend is
 * the single source of truth — these helpers are thin transport.
 */
import { api } from "./client";

const BASE = "/api/v1/branding-center/channels";

// ---------------------------------------------------------------------------
// Types — keep aligned with backend/app/branding_center/schemas.py
// ---------------------------------------------------------------------------

export interface ChannelSummary {
  id: string;
  profile_name: string;
  channel_slug: string;
  platform?: string | null;
  title?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  import_status?: string | null;
  user_id: string;
}

export interface IdentitySection {
  brand_name?: string | null;
  brand_summary?: string | null;
}

export interface AudienceSection {
  audience_profile?: Record<string, unknown> | null;
  positioning_statement?: string | null;
}

export interface VisualSection {
  palette?: string | null;
  typography?: string | null;
  motion_style?: string | null;
  logo_path?: string | null;
  watermark_path?: string | null;
  watermark_position?: string | null;
  lower_third_defaults?: string | null;
}

export interface MessagingSection {
  tone_of_voice?: string | null;
  messaging_pillars?: string[] | null;
}

export interface PlatformOutputSection {
  channel_description?: string | null;
  channel_keywords?: string[] | null;
  banner_prompt?: string | null;
  logo_prompt?: string | null;
}

export interface ApplyRequest {
  surfaces?: string[];
  dry_run?: boolean;
}

export interface ApplyResultItem {
  surface: string;
  status: string;
  detail?: string | null;
}

export interface ApplyResponse {
  ok: boolean;
  applied_at: string;
  items: ApplyResultItem[];
}

export interface BrandingCenterResponse {
  channel: ChannelSummary;
  brand_profile_id: string;
  updated_at: string;
  identity: IdentitySection;
  audience: AudienceSection;
  visual: VisualSection;
  messaging: MessagingSection;
  platform_output: PlatformOutputSection;
  apply_status: Record<string, unknown>;
  completeness: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchBrandingCenter(
  channelId: string,
): Promise<BrandingCenterResponse> {
  return api.get<BrandingCenterResponse>(`${BASE}/${channelId}`);
}

export function saveIdentity(
  channelId: string,
  payload: IdentitySection,
): Promise<BrandingCenterResponse> {
  return api.patch<BrandingCenterResponse>(
    `${BASE}/${channelId}/identity`,
    payload,
  );
}

export function saveAudience(
  channelId: string,
  payload: AudienceSection,
): Promise<BrandingCenterResponse> {
  return api.patch<BrandingCenterResponse>(
    `${BASE}/${channelId}/audience`,
    payload,
  );
}

export function saveVisual(
  channelId: string,
  payload: VisualSection,
): Promise<BrandingCenterResponse> {
  return api.patch<BrandingCenterResponse>(
    `${BASE}/${channelId}/visual`,
    payload,
  );
}

export function saveMessaging(
  channelId: string,
  payload: MessagingSection,
): Promise<BrandingCenterResponse> {
  return api.patch<BrandingCenterResponse>(
    `${BASE}/${channelId}/messaging`,
    payload,
  );
}

export function savePlatformOutput(
  channelId: string,
  payload: PlatformOutputSection,
): Promise<BrandingCenterResponse> {
  return api.patch<BrandingCenterResponse>(
    `${BASE}/${channelId}/platform-output`,
    payload,
  );
}

export function applyBranding(
  channelId: string,
  payload: ApplyRequest,
): Promise<ApplyResponse> {
  return api.post<ApplyResponse>(`${BASE}/${channelId}/apply`, payload);
}
