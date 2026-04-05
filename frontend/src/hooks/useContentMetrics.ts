import { useQuery } from "@tanstack/react-query";
import { fetchContentMetrics, AnalyticsWindow, OverviewFetchOptions } from "../api/analyticsApi";

export function useContentMetrics(windowOrOpts: AnalyticsWindow | OverviewFetchOptions) {
  const queryKey = typeof windowOrOpts === "string"
    ? ["analytics", "content", windowOrOpts]
    : ["analytics", "content", windowOrOpts.window, windowOrOpts.date_from ?? "", windowOrOpts.date_to ?? ""];

  return useQuery({
    queryKey,
    queryFn: () => fetchContentMetrics(windowOrOpts),
    staleTime: 30_000,
  });
}
