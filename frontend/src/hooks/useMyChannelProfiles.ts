/**
 * useMyChannelProfiles — Fetch channel profiles for the current authenticated user.
 * Faz 5: Wizard ChannelProfile integration.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../api/channelProfilesApi";
import { useAuthStore } from "../stores/authStore";

export function useMyChannelProfiles() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<ChannelProfileResponse[]>({
    queryKey: ["channel-profiles", "mine", userId],
    queryFn: () => fetchChannelProfiles(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
