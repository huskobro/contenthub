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

export async function fetchCredentialStatuses(): Promise<CredentialStatus[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch credentials: ${res.status}`);
  }
  return res.json();
}

export async function fetchCredentialStatus(key: string): Promise<CredentialStatus> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(key)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch credential ${key}: ${res.status}`);
  }
  return res.json();
}

export interface SaveCredentialResponse extends CredentialStatus {
  wiring: {
    key: string;
    action: string;
    provider_id: string | null;
  };
}

export async function saveCredential(
  key: string,
  value: string,
): Promise<SaveCredentialResponse> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `Failed to save credential: ${res.status}`);
  }
  return res.json();
}

export async function validateCredential(
  key: string,
): Promise<{ key: string; valid: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(key)}/validate`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Validation failed: ${res.status}`);
  }
  return res.json();
}

// YouTube OAuth helpers
const YT_BASE = "/api/v1/publish/youtube";

export interface YouTubeTokenStatus {
  has_credentials: boolean;
  message: string;
}

export async function fetchYouTubeStatus(): Promise<YouTubeTokenStatus> {
  const res = await fetch(`${YT_BASE}/status`);
  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube status: ${res.status}`);
  }
  return res.json();
}

export async function revokeYouTubeCredentials(): Promise<void> {
  const res = await fetch(`${YT_BASE}/revoke`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`Failed to revoke YouTube credentials: ${res.status}`);
  }
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

export async function fetchYouTubeChannelInfo(): Promise<YouTubeChannelInfo> {
  const res = await fetch(`${YT_BASE}/channel-info`);
  if (!res.ok) {
    throw new Error(`Failed to fetch channel info: ${res.status}`);
  }
  return res.json();
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

export async function fetchYouTubeVideoStats(): Promise<VideoStatsResponse> {
  const res = await fetch(`${YT_BASE}/video-stats`);
  if (!res.ok) {
    throw new Error(`YouTube video stats: ${res.status}`);
  }
  return res.json();
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

export async function fetchVideoStatsTrend(videoId: string): Promise<VideoStatsTrendResponse> {
  const res = await fetch(`${YT_BASE}/video-stats/${encodeURIComponent(videoId)}/trend`);
  if (!res.ok) throw new Error(`Failed to fetch video stats trend: ${res.status}`);
  return res.json();
}

export async function getYouTubeAuthUrl(redirectUri: string): Promise<string> {
  const params = new URLSearchParams({ redirect_uri: redirectUri });
  const res = await fetch(`${YT_BASE}/auth-url?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `Failed to get auth URL: ${res.status}`);
  }
  const data = await res.json();
  return data.auth_url;
}
