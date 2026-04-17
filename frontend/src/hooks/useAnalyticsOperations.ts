import { useQuery } from "@tanstack/react-query";
import { fetchOperationsMetrics, AnalyticsWindow } from "../api/analyticsApi";
import { useActiveScope } from "./useActiveScope";

/**
 * Redesign REV-2 / P0.3b:
 *   Cache key scope-bilinçli hale getirildi; admin scope değişince cache
 *   temiz ayrışır. Backend ownership değişmedi — bu sadece görünürlük katmanı.
 */
export function useAnalyticsOperations(window: AnalyticsWindow) {
  const scope = useActiveScope();
  return useQuery({
    queryKey: [
      "analytics",
      "operations",
      window,
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () => fetchOperationsMetrics(window),
    staleTime: 30_000,
    // isReady gate eklenmedi — bkz. useAnalyticsOverview açıklaması.
  });
}
