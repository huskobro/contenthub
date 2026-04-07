import { api } from "./client";

const BASE_URL = "/api/v1/settings/credentials";

export interface CredentialStatus {
  key: string;
  status: "configured" | "env_only" | "missing" | "invalid" | "connected";
  source: "db" | "env" | "none";
  masked_value: string | null;
  updated_at: string | null;
  label: string;
  help_text: string;
  group: string;
  capability: string;
}

export function fetchCredentialStatuses(): Promise<CredentialStatus[]> {
  return api.get<CredentialStatus[]>(BASE_URL);
}

export function fetchCredentialStatus(key: string): Promise<CredentialStatus> {
  return api.get<CredentialStatus>(`${BASE_URL}/${encodeURIComponent(key)}`);
}

export interface SaveCredentialResponse extends CredentialStatus {
  wiring: {
    key: string;
    action: string;
    provider_id: string | null;
  };
}

export function saveCredential(
  key: string,
  value: string,
): Promise<SaveCredentialResponse> {
  return api.put<SaveCredentialResponse>(`${BASE_URL}/${encodeURIComponent(key)}`, { value });
}

export function validateCredential(
  key: string,
): Promise<{ key: string; valid: boolean; message: string }> {
  return api.post<{ key: string; valid: boolean; message: string }>(`${BASE_URL}/${encodeURIComponent(key)}/validate`);
}

// YouTube OAuth helpers
const YT_BASE = "/api/v1/publish/youtube";

export interface YouTubeTokenStatus {
  has_credentials: boolean;
  scope_ok: boolean;
  message: string;
}

export function fetchYouTubeStatus(): Promise<YouTubeTokenStatus> {
  return api.get<YouTubeTokenStatus>(`${YT_BASE}/status`);
}

export function revokeYouTubeCredentials(): Promise<void> {
  return api.delete<void>(`${YT_BASE}/revoke`);
}

export interface YouTubeChannelInfo {
  connected: boolean;
  channel_id: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  subscriber_count: string | null;
  video_count: string | null;
  message: string;
}

export function fetchYouTubeChannelInfo(): Promise<YouTubeChannelInfo> {
  return api.get<YouTubeChannelInfo>(`${YT_BASE}/channel-info`);
}

// YouTube Video Stats
export interface VideoStatsItem {
  video_id: string;
  title: string;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
}

export interface VideoStatsResponse {
  videos: VideoStatsItem[];
  total_views: number;
  total_likes: number;
  total_comments: number;
  video_count: number;
}

export function fetchYouTubeVideoStats(): Promise<VideoStatsResponse> {
  return api.get<VideoStatsResponse>(`${YT_BASE}/video-stats`);
}

// YouTube Video Stats Trend (M14-C)
export interface VideoStatsTrendItem {
  snapshot_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
}

export interface VideoStatsTrendResponse {
  video_id: string;
  title: string;
  snapshots: VideoStatsTrendItem[];
}

export function fetchVideoStatsTrend(videoId: string): Promise<VideoStatsTrendResponse> {
  return api.get<VideoStatsTrendResponse>(`${YT_BASE}/video-stats/${encodeURIComponent(videoId)}/trend`);
}

export async function getYouTubeAuthUrl(redirectUri: string): Promise<string> {
  const data = await api.get<{ auth_url: string }>(`${YT_BASE}/auth-url`, { redirect_uri: redirectUri });
  return data.auth_url;
}
