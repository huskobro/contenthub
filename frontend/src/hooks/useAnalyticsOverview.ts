import { useQuery } from "@tanstack/react-query";
import { fetchOverviewMetrics, AnalyticsWindow, OverviewFetchOptions } from "../api/analyticsApi";

export function useAnalyticsOverview(windowOrOpts: AnalyticsWindow | OverviewFetchOptions) {
  const queryKey = typeof windowOrOpts === "string"
    ? ["analytics", "overview", windowOrOpts]
    : ["analytics", "overview", windowOrOpts.window, windowOrOpts.date_from ?? "", windowOrOpts.date_to ?? ""];

  return useQuery({
    queryKey,
    queryFn: () => fetchOverviewMetrics(windowOrOpts),
    staleTime: 30_000,
  });
}
