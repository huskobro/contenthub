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

/**
 * Phase AI — validate endpoint artik `live_tested` field'i ile aciklayici mesaj doner.
 * `live_tested=false` ise backend yalnizca DB/env kaydinin dolu olup olmadigini dogrulamistir;
 * provider'a canli istek atilmamistir. UI bunu kullaniciya acikca iletmeli.
 */
export interface ValidateCredentialResponse {
  key: string;
  valid: boolean;
  live_tested: boolean;
  message: string;
}

export function validateCredential(
  key: string,
): Promise<ValidateCredentialResponse> {
  return api.post<ValidateCredentialResponse>(`${BASE_URL}/${encodeURIComponent(key)}/validate`);
}

// YouTube OAuth helpers
const YT_BASE = "/api/v1/publish/youtube";

export interface YouTubeTokenStatus {
  has_credentials: boolean;
  scope_ok: boolean;
  message: string;
  connection_id?: string | null;
}

export function fetchYouTubeStatus(connectionId?: string): Promise<YouTubeTokenStatus> {
  const params: Record<string, string> = {};
  if (connectionId) params.connection_id = connectionId;
  return api.get<YouTubeTokenStatus>(`${YT_BASE}/status`, Object.keys(params).length ? params : undefined);
}

/**
 * Revoke a YouTube connection's stored credentials.
 *
 * Pass either a raw PlatformConnection id (`connectionId`) OR a channel
 * profile id (`channelProfileId`). Historically callers passed
 * channel_profile_id as `connectionId`, which silently 404'd on the backend
 * — channelProfileId is now the canonical per-channel path.
 */
export function revokeYouTubeCredentials(
  opts?: string | { connectionId?: string; channelProfileId?: string },
): Promise<void> {
  let connectionId: string | undefined;
  let channelProfileId: string | undefined;
  if (typeof opts === "string") {
    connectionId = opts;
  } else if (opts) {
    connectionId = opts.connectionId;
    channelProfileId = opts.channelProfileId;
  }
  const params = new URLSearchParams();
  if (connectionId) params.set("connection_id", connectionId);
  if (channelProfileId) params.set("channel_profile_id", channelProfileId);
  const qs = params.toString();
  const url = qs ? `${YT_BASE}/revoke?${qs}` : `${YT_BASE}/revoke`;
  return api.delete<void>(url);
}

// Per-channel YouTube status
export function fetchYouTubeStatusByChannel(channelProfileId: string): Promise<YouTubeTokenStatus> {
  return api.get<YouTubeTokenStatus>(`${YT_BASE}/status`, { channel_profile_id: channelProfileId });
}

// Per-channel YouTube channel info
export function fetchYouTubeChannelInfoByChannel(channelProfileId: string): Promise<YouTubeChannelInfo> {
  return api.get<YouTubeChannelInfo>(`${YT_BASE}/channel-info`, { channel_profile_id: channelProfileId });
}

export interface YouTubeChannelInfo {
  connected: boolean;
  channel_id: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  subscriber_count: string | null;
  video_count: string | null;
  message: string;
  connection_id?: string | null;
}

export function fetchYouTubeChannelInfo(connectionId?: string): Promise<YouTubeChannelInfo> {
  const params: Record<string, string> = {};
  if (connectionId) params.connection_id = connectionId;
  return api.get<YouTubeChannelInfo>(`${YT_BASE}/channel-info`, Object.keys(params).length ? params : undefined);
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

// YouTube Channel All Videos
export interface ChannelVideoItem {
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: string | null;
  is_contenthub: boolean;
}

export interface ChannelVideosResponse {
  videos: ChannelVideoItem[];
  total_count: number;
  contenthub_count: number;
  fetched_count: number;
}

export function fetchChannelVideos(maxResults = 50, channelProfileId?: string): Promise<ChannelVideosResponse> {
  const params: Record<string, string | number> = { max_results: maxResults };
  if (channelProfileId) params.channel_profile_id = channelProfileId;
  return api.get<ChannelVideosResponse>(`${YT_BASE}/channel-videos`, params);
}

export async function getYouTubeAuthUrl(redirectUri: string, channelProfileId?: string): Promise<string> {
  const params: Record<string, string> = { redirect_uri: redirectUri };
  if (channelProfileId) params.channel_profile_id = channelProfileId;
  const data = await api.get<{ auth_url: string }>(`${YT_BASE}/auth-url`, params);
  return data.auth_url;
}

// Per-channel YouTube API credentials
export interface ChannelCredentialsResponse {
  channel_profile_id: string;
  has_credentials: boolean;
  masked_client_id: string | null;
  message: string;
}

export function fetchChannelCredentials(channelProfileId: string): Promise<ChannelCredentialsResponse> {
  return api.get<ChannelCredentialsResponse>(`${YT_BASE}/channel-credentials/${encodeURIComponent(channelProfileId)}`);
}

export function saveChannelCredentials(
  channelProfileId: string,
  clientId: string,
  clientSecret: string,
): Promise<ChannelCredentialsResponse> {
  return api.put<ChannelCredentialsResponse>(
    `${YT_BASE}/channel-credentials/${encodeURIComponent(channelProfileId)}`,
    { client_id: clientId, client_secret: clientSecret },
  );
}
