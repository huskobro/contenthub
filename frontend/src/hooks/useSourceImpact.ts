import { useQuery } from "@tanstack/react-query";
import { fetchSourceImpactMetrics, AnalyticsWindow } from "../api/analyticsApi";

export function useSourceImpact(window: AnalyticsWindow) {
  return useQuery({
    queryKey: ["analytics", "source-impact", window],
    queryFn: () => fetchSourceImpactMetrics(window),
    staleTime: 30_000,
  });
}
