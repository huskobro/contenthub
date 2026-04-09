/**
 * useChannelConnection — Faz 17a.
 *
 * Looks up the primary (or first) PlatformConnection for a given channel profile.
 * Used by comments/playlists/posts pages that filter by channel but need
 * connection-level capability awareness.
 *
 * Returns the connectionId + basic health info so modules can:
 *  1. Show ConnectionCapabilityWarning
 *  2. Disable actions when capability is blocked
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchPlatformConnections,
  type PlatformConnectionResponse,
} from "../api/platformConnectionsApi";

export interface ChannelConnectionInfo {
  connectionId: string | undefined;
  connection: PlatformConnectionResponse | undefined;
  isConnected: boolean;
  hasValidToken: boolean;
  requiresReauth: boolean;
}

const EMPTY: ChannelConnectionInfo = {
  connectionId: undefined,
  connection: undefined,
  isConnected: false,
  hasValidToken: false,
  requiresReauth: false,
};

export function useChannelConnection(channelProfileId: string | undefined) {
  const { data: connections, isLoading } = useQuery({
    queryKey: ["platform-connections", channelProfileId],
    queryFn: () => fetchPlatformConnections(channelProfileId!),
    enabled: !!channelProfileId,
    staleTime: 60_000,
  });

  if (!channelProfileId || isLoading || !connections || connections.length === 0) {
    return { ...EMPTY, isLoading };
  }

  // Prefer primary connection, fallback to first
  const primary = connections.find((c) => c.is_primary) || connections[0];

  return {
    connectionId: primary.id,
    connection: primary,
    isConnected: primary.connection_status === "connected",
    hasValidToken: primary.token_state === "valid",
    requiresReauth: primary.requires_reauth,
    isLoading,
  };
}
