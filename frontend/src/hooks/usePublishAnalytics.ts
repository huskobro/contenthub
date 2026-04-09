/**
 * usePublishAnalytics — Faz 6.
 *
 * React Query hook for publish-specific analytics.
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchPublishAnalytics,
  type AnalyticsFilterParams,
} from "../api/analyticsApi";

export function usePublishAnalytics(filters: AnalyticsFilterParams = {}) {
  return useQuery({
    queryKey: ["publish-analytics", filters],
    queryFn: () => fetchPublishAnalytics(filters),
    staleTime: 30_000,
  });
}
