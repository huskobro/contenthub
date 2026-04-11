import { api } from "./client";

/**
 * YouTube Analytics API v2 client — Sprint 1 / Faz YT-A1.
 *
 * Wraps /api/v1/analytics/youtube/* endpoints backed by
 * YouTubeAnalyticsService snapshots (SQLite tables youtube_*_snapshot).
 */

const BASE = "/api/v1/analytics/youtube";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YtChannelDailyRow {
  date: string;
  views: number;
  estimated_minutes_watched: number;
  average_view_duration_seconds: number;
  average_view_percentage: number;
  subscribers_gained: number;
  subscribers_lost: number;
  likes: number;
  shares: number;
  comments: number;
}

export interface YtChannelTotals {
  window_days: number;
  daily: YtChannelDailyRow[];
  totals: {
    views: number;
    estimated_minutes_watched: number;
    subscribers_net: number;
    likes: number;
    shares: number;
    comments: number;
  };
  averages: {
    average_view_duration_seconds: number;
    average_view_percentage: number;
  };
}

export interface YtTopVideoRow {
  platform_video_id: string;
  views: number;
  estimated_minutes_watched: number;
  likes: number;
  shares: number;
  comments: number;
  average_view_duration_seconds: number;
  average_view_percentage: number;
}

export interface YtTopVideosResponse {
  connection_id: string;
  window_days: number;
  videos: YtTopVideoRow[];
}

export interface YtRetentionPoint {
  elapsed_ratio: number;
  audience_watch_ratio: number;
  relative_retention_performance: number;
}

export interface YtRetentionResponse {
  connection_id: string;
  video_id: string;
  curve: YtRetentionPoint[];
}

export interface YtDemographicRow {
  age_group: string;
  gender: string;
  viewer_percentage: number;
}

export interface YtDemographicsResponse {
  connection_id: string;
  video_id: string;
  rows: YtDemographicRow[];
}

export interface YtTrafficRow {
  traffic_source_type: string;
  views: number;
  estimated_minutes_watched: number;
}

export interface YtTrafficResponse {
  connection_id: string;
  video_id: string;
  rows: YtTrafficRow[];
}

export interface YtDeviceRow {
  device_type: string;
  views: number;
  estimated_minutes_watched: number;
}

export interface YtDeviceResponse {
  connection_id: string;
  video_id: string;
  rows: YtDeviceRow[];
}

export interface YtSyncLog {
  id: string;
  status: "running" | "ok" | "partial" | "failed";
  run_kind: string;
  trigger_source: string;
  started_at: string | null;
  finished_at: string | null;
  rows_written: number;
  error_message: string | null;
}

export interface YtLastSyncResponse {
  connection_id: string;
  last_sync: YtSyncLog | null;
}

export interface YtSyncTriggerResponse {
  connection_id: string;
  log: YtSyncLog;
}

export interface YtSyncAllResult {
  connection_id: string;
  status: string;
  rows_written: number;
  error: string | null;
}

export interface YtSyncAllResponse {
  results: YtSyncAllResult[];
  count: number;
}

// ---------------------------------------------------------------------------
// Read endpoints
// ---------------------------------------------------------------------------

export function fetchYtChannelTotals(
  connectionId: string,
  windowDays: number = 28,
): Promise<YtChannelTotals> {
  return api.get<YtChannelTotals>(`${BASE}/channel-totals`, {
    connection_id: connectionId,
    window_days: windowDays,
  });
}

export function fetchYtTopVideos(
  connectionId: string,
  windowDays: number = 28,
  limit: number = 10,
): Promise<YtTopVideosResponse> {
  return api.get<YtTopVideosResponse>(`${BASE}/top-videos`, {
    connection_id: connectionId,
    window_days: windowDays,
    limit,
  });
}

export function fetchYtRetentionCurve(
  connectionId: string,
  videoId: string,
): Promise<YtRetentionResponse> {
  return api.get<YtRetentionResponse>(`${BASE}/retention/${videoId}`, {
    connection_id: connectionId,
  });
}

export function fetchYtDemographics(
  connectionId: string,
  videoId: string = "",
): Promise<YtDemographicsResponse> {
  return api.get<YtDemographicsResponse>(`${BASE}/demographics`, {
    connection_id: connectionId,
    video_id: videoId,
  });
}

export function fetchYtTrafficSources(
  connectionId: string,
  videoId: string = "",
): Promise<YtTrafficResponse> {
  return api.get<YtTrafficResponse>(`${BASE}/traffic-sources`, {
    connection_id: connectionId,
    video_id: videoId,
  });
}

export function fetchYtDevices(
  connectionId: string,
  videoId: string = "",
): Promise<YtDeviceResponse> {
  return api.get<YtDeviceResponse>(`${BASE}/devices`, {
    connection_id: connectionId,
    video_id: videoId,
  });
}

export function fetchYtLastSync(
  connectionId: string,
): Promise<YtLastSyncResponse> {
  return api.get<YtLastSyncResponse>(`${BASE}/last-sync`, {
    connection_id: connectionId,
  });
}

// ---------------------------------------------------------------------------
// Write endpoints (manual sync)
// ---------------------------------------------------------------------------

export function triggerYtSync(
  connectionId: string,
  windowDays: number = 28,
  runKind: "manual" | "backfill" | "daily" = "manual",
): Promise<YtSyncTriggerResponse> {
  return api.post<YtSyncTriggerResponse>(
    `${BASE}/sync?connection_id=${encodeURIComponent(connectionId)}&window_days=${windowDays}&run_kind=${runKind}`,
    {},
  );
}

export function triggerYtSyncAll(): Promise<YtSyncAllResponse> {
  return api.post<YtSyncAllResponse>(`${BASE}/sync-all`, {});
}
