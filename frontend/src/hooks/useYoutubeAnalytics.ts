import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchYtChannelTotals,
  fetchYtDemographics,
  fetchYtDevices,
  fetchYtLastSync,
  fetchYtRetentionCurve,
  fetchYtTopVideos,
  fetchYtTrafficSources,
  triggerYtSync,
  triggerYtSyncAll,
} from "../api/youtubeAnalyticsApi";

/**
 * React Query hooks for YouTube Analytics API v2 — Sprint 1 / Faz YT-A1.
 *
 * All read hooks accept a `connectionId` that must be a YouTube
 * PlatformConnection.id. Pass `undefined` to disable the query (e.g.
 * when no channel is selected).
 */

const STALE = 60_000; // 1 minute — snapshots refreshed daily

export function useYtChannelTotals(
  connectionId: string | undefined,
  windowDays: number = 28,
) {
  return useQuery({
    queryKey: ["yt-analytics", "channel-totals", connectionId, windowDays],
    queryFn: () => fetchYtChannelTotals(connectionId!, windowDays),
    enabled: Boolean(connectionId),
    staleTime: STALE,
  });
}

export function useYtTopVideos(
  connectionId: string | undefined,
  windowDays: number = 28,
  limit: number = 10,
) {
  return useQuery({
    queryKey: ["yt-analytics", "top-videos", connectionId, windowDays, limit],
    queryFn: () => fetchYtTopVideos(connectionId!, windowDays, limit),
    enabled: Boolean(connectionId),
    staleTime: STALE,
  });
}

export function useYtRetentionCurve(
  connectionId: string | undefined,
  videoId: string | undefined,
) {
  return useQuery({
    queryKey: ["yt-analytics", "retention", connectionId, videoId],
    queryFn: () => fetchYtRetentionCurve(connectionId!, videoId!),
    enabled: Boolean(connectionId && videoId),
    staleTime: STALE,
  });
}

export function useYtDemographics(
  connectionId: string | undefined,
  videoId: string = "",
) {
  return useQuery({
    queryKey: ["yt-analytics", "demographics", connectionId, videoId],
    queryFn: () => fetchYtDemographics(connectionId!, videoId),
    enabled: Boolean(connectionId),
    staleTime: STALE,
  });
}

export function useYtTrafficSources(
  connectionId: string | undefined,
  videoId: string = "",
) {
  return useQuery({
    queryKey: ["yt-analytics", "traffic", connectionId, videoId],
    queryFn: () => fetchYtTrafficSources(connectionId!, videoId),
    enabled: Boolean(connectionId),
    staleTime: STALE,
  });
}

export function useYtDevices(
  connectionId: string | undefined,
  videoId: string = "",
) {
  return useQuery({
    queryKey: ["yt-analytics", "devices", connectionId, videoId],
    queryFn: () => fetchYtDevices(connectionId!, videoId),
    enabled: Boolean(connectionId),
    staleTime: STALE,
  });
}

export function useYtLastSync(connectionId: string | undefined) {
  return useQuery({
    queryKey: ["yt-analytics", "last-sync", connectionId],
    queryFn: () => fetchYtLastSync(connectionId!),
    enabled: Boolean(connectionId),
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useTriggerYtSync(connectionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { windowDays?: number; runKind?: "manual" | "backfill" | "daily" }) =>
      triggerYtSync(
        connectionId!,
        opts?.windowDays ?? 28,
        opts?.runKind ?? "manual",
      ),
    onSuccess: () => {
      // Invalidate every yt-analytics query tied to this connection
      qc.invalidateQueries({ queryKey: ["yt-analytics"] });
    },
  });
}

export function useTriggerYtSyncAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => triggerYtSyncAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yt-analytics"] });
    },
  });
}
