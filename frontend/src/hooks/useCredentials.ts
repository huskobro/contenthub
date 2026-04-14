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
  fetchYouTubeStatusByChannel,
  fetchYouTubeChannelInfoByChannel,
  fetchChannelCredentials,
  saveChannelCredentials,
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
    queryFn: () => fetchYouTubeStatus(),
  });
}

export function useYouTubeChannelInfo() {
  return useQuery({
    queryKey: ["youtube", "channel-info"],
    queryFn: () => fetchYouTubeChannelInfo(),
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

export function useChannelVideos(enabled = true, channelProfileId?: string) {
  return useQuery({
    queryKey: ["youtube", "channel-videos", channelProfileId],
    queryFn: () => fetchChannelVideos(50, channelProfileId),
    enabled,
    staleTime: 120_000,
    retry: false,
  });
}

export function useRevokeYouTube() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (
      opts?: string | { connectionId?: string; channelProfileId?: string },
    ) => revokeYouTubeCredentials(opts),
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube"] });
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      queryClient.invalidateQueries({ queryKey: ["my-connections"] });
    },
  });
}

// Per-channel YouTube hooks
export function useYouTubeStatusByChannel(channelProfileId: string | null) {
  return useQuery({
    queryKey: ["youtube", "status", channelProfileId],
    queryFn: () => fetchYouTubeStatusByChannel(channelProfileId!),
    enabled: !!channelProfileId,
  });
}

export function useYouTubeChannelInfoByChannel(channelProfileId: string | null) {
  return useQuery({
    queryKey: ["youtube", "channel-info", channelProfileId],
    queryFn: () => fetchYouTubeChannelInfoByChannel(channelProfileId!),
    enabled: !!channelProfileId,
  });
}

// Per-channel YouTube API credential hooks
export function useChannelCredentials(channelProfileId: string | null) {
  return useQuery({
    queryKey: ["youtube", "channel-credentials", channelProfileId],
    queryFn: () => fetchChannelCredentials(channelProfileId!),
    enabled: !!channelProfileId,
  });
}

export function useSaveChannelCredentials() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({
      channelProfileId,
      clientId,
      clientSecret,
    }: {
      channelProfileId: string;
      clientId: string;
      clientSecret: string;
    }) => saveChannelCredentials(channelProfileId, clientId, clientSecret),
    onError,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["youtube", "channel-credentials", variables.channelProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["youtube", "status", variables.channelProfileId],
      });
    },
  });
}
