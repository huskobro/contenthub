import { useQuery } from "@tanstack/react-query";
import { fetchChannelOverviewMetrics, AnalyticsWindow } from "../api/analyticsApi";

export function useChannelOverview(window: AnalyticsWindow) {
  return useQuery({
    queryKey: ["analytics", "channel", window],
    queryFn: () => fetchChannelOverviewMetrics(window),
    staleTime: 30_000,
  });
}
