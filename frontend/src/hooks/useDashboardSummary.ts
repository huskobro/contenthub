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
    // Faz 4 perf: 60s polling kept for "live" feel, but pause while the tab
    // is hidden so a forgotten admin tab doesn't hammer the analytics
    // aggregator every minute for hours.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
