/**
 * useChannelPerformance — Faz 10.
 *
 * React Query hook for channel performance analytics endpoint.
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchChannelPerformance,
  type AnalyticsFilterParams,
  type ChannelPerformanceData,
} from "../api/analyticsApi";

export function useChannelPerformance(filters: AnalyticsFilterParams) {
  return useQuery<ChannelPerformanceData>({
    queryKey: ["channel-performance", filters],
    queryFn: () => fetchChannelPerformance(filters),
    staleTime: 30_000,
  });
}
