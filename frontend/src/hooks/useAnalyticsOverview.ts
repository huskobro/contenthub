import { useQuery } from "@tanstack/react-query";
import { fetchOverviewMetrics, AnalyticsWindow } from "../api/analyticsApi";

export function useAnalyticsOverview(window: AnalyticsWindow) {
  return useQuery({
    queryKey: ["analytics", "overview", window],
    queryFn: () => fetchOverviewMetrics(window),
    staleTime: 30_000,
  });
}
