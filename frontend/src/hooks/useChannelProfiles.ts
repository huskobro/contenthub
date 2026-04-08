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
  type CreateChannelProfile,
} from "../api/channelProfilesApi";

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
  return useMutation({
    mutationFn: (data: CreateChannelProfile) => createChannelProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-profiles"] });
    },
  });
}
