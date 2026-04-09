/**
 * useConnections — Faz 17.
 *
 * React Query hooks for Connection Center (user + admin).
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchMyConnections,
  fetchAdminConnections,
  fetchConnectionHealth,
  fetchConnectionCapability,
  type ConnectionCenterListResponse,
  type ConnectionWithHealth,
  type CapabilityMatrix,
} from "../api/platformConnectionsApi";

// ---------------------------------------------------------------------------
// User: my connections
// ---------------------------------------------------------------------------

export function useMyConnections(params?: {
  platform?: string;
  health_level?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery<ConnectionCenterListResponse>({
    queryKey: ["connections", "my", params],
    queryFn: () => fetchMyConnections(params),
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Admin: all connections
// ---------------------------------------------------------------------------

export function useAdminConnections(params?: {
  user_id?: string;
  channel_profile_id?: string;
  platform?: string;
  health_level?: string;
  requires_reauth?: boolean;
  skip?: number;
  limit?: number;
}) {
  return useQuery<ConnectionCenterListResponse>({
    queryKey: ["connections", "admin", params],
    queryFn: () => fetchAdminConnections(params),
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Single connection health
// ---------------------------------------------------------------------------

export function useConnectionHealth(connectionId: string | undefined) {
  return useQuery<ConnectionWithHealth>({
    queryKey: ["connections", "health", connectionId],
    queryFn: () => fetchConnectionHealth(connectionId!),
    enabled: !!connectionId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Single connection capability
// ---------------------------------------------------------------------------

export function useConnectionCapability(connectionId: string | undefined) {
  return useQuery<CapabilityMatrix>({
    queryKey: ["connections", "capability", connectionId],
    queryFn: () => fetchConnectionCapability(connectionId!),
    enabled: !!connectionId,
    staleTime: 30_000,
  });
}
