/**
 * Channel Profile hooks — Faz 4.
 *
 * React Query hooks for channel profile CRUD.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchChannelProfiles,
  fetchChannelProfile,
  createChannelProfile,
  deleteChannelProfile,
  type CreateChannelProfile,
} from "../api/channelProfilesApi";
import { useApiError } from "./useApiError";

export function useChannelProfiles(userId?: string) {
  return useQuery({
    queryKey: ["channel-profiles", userId ?? "all"],
    queryFn: () => fetchChannelProfiles(userId),
  });
}

export function useChannelProfile(profileId: string) {
  return useQuery({
    queryKey: ["channel-profiles", profileId],
    queryFn: () => fetchChannelProfile(profileId),
    enabled: !!profileId,
  });
}

export function useCreateChannelProfile() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (data: CreateChannelProfile) => createChannelProfile(data),
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-profiles"] });
    },
  });
}

/**
 * Soft-delete a channel profile (backend sets status='archived'; no hard delete).
 * Jobs and prior artifacts tied to the profile remain intact so audit history
 * is preserved.
 */
export function useDeleteChannelProfile() {
  const queryClient = useQueryClient();
  const onError = useApiError();
  return useMutation({
    mutationFn: (profileId: string) => deleteChannelProfile(profileId),
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-profiles"] });
    },
  });
}
