import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCredentialStatuses,
  saveCredential,
  validateCredential,
  fetchYouTubeStatus,
  fetchYouTubeChannelInfo,
  fetchYouTubeVideoStats,
  fetchVideoStatsTrend,
  fetchChannelVideos,
  revokeYouTubeCredentials,
} from "../api/credentialsApi";
import { useApiError } from "./useApiError";

export function useCredentialsList() {
  return useQuery({
    queryKey: ["credentials"],
    queryFn: fetchCredentialStatuses,
  });
}

export function useSaveCredential() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      saveCredential(key, value),
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
  });
}

export function useValidateCredential() {
  const onError = useApiError();
  return useMutation({
    mutationFn: (key: string) => validateCredential(key),
    onError,
  });
}

export function useYouTubeStatus() {
  return useQuery({
    queryKey: ["youtube", "status"],
    queryFn: fetchYouTubeStatus,
  });
}

export function useYouTubeChannelInfo() {
  return useQuery({
    queryKey: ["youtube", "channel-info"],
    queryFn: fetchYouTubeChannelInfo,
  });
}

export function useYouTubeVideoStats() {
  return useQuery({
    queryKey: ["youtube", "video-stats"],
    queryFn: fetchYouTubeVideoStats,
    retry: false,
    staleTime: 60_000,
  });
}

export function useVideoStatsTrend(videoId: string | null) {
  return useQuery({
    queryKey: ["youtube-video-trend", videoId],
    queryFn: () => fetchVideoStatsTrend(videoId!),
    enabled: !!videoId,
    staleTime: 60_000,
    retry: false,
  });
}

export function useChannelVideos(enabled = true) {
  return useQuery({
    queryKey: ["youtube", "channel-videos"],
    queryFn: () => fetchChannelVideos(50),
    enabled,
    staleTime: 120_000,
    retry: false,
  });
}

export function useRevokeYouTube() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: revokeYouTubeCredentials,
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube", "status"] });
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
  });
}
