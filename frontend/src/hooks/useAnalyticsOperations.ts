import { useQuery } from "@tanstack/react-query";
import { fetchOperationsMetrics, AnalyticsWindow } from "../api/analyticsApi";

export function useAnalyticsOperations(window: AnalyticsWindow) {
  return useQuery({
    queryKey: ["analytics", "operations", window],
    queryFn: () => fetchOperationsMetrics(window),
    staleTime: 30_000,
  });
}
