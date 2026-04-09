/**
 * useDashboardSummary — Faz 6.
 *
 * React Query hook for the admin dashboard summary endpoint.
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardSummary,
  type AnalyticsFilterParams,
} from "../api/analyticsApi";

export function useDashboardSummary(filters: AnalyticsFilterParams = {}) {
  return useQuery({
    queryKey: ["dashboard-summary", filters],
    queryFn: () => fetchDashboardSummary(filters),
    staleTime: 30_000,
    refetchInterval: 60_000, // Auto-refresh every 60s for live dashboard feel
  });
}
