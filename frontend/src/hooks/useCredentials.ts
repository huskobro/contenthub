import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCredentialStatuses,
  saveCredential,
  validateCredential,
  fetchYouTubeStatus,
  fetchYouTubeChannelInfo,
  revokeYouTubeCredentials,
} from "../api/credentialsApi";

export function useCredentialsList() {
  return useQuery({
    queryKey: ["credentials"],
    queryFn: fetchCredentialStatuses,
  });
}

export function useSaveCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      saveCredential(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
  });
}

export function useValidateCredential() {
  return useMutation({
    mutationFn: (key: string) => validateCredential(key),
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

export function useRevokeYouTube() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeYouTubeCredentials,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube", "status"] });
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
  });
}
