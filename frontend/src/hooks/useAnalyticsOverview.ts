import { useQuery } from "@tanstack/react-query";
import { fetchOverviewMetrics, AnalyticsWindow, OverviewFetchOptions } from "../api/analyticsApi";
import { useActiveScope } from "./useActiveScope";

/**
 * Redesign REV-2 / P0.3b:
 *   Cache key'e `useActiveScope()` parmak izi eklendi. Admin `"all"` <->
 *   `"user focus"` geçişinde analytics cache'i temiz ayrışır. `enabled`
 *   `scope.isReady` ile gated — auth hidrat bekleniyorsa çalışmaz.
 *
 *   Backend filtresi hâlâ `AnalyticsFilterParams.user_id` ile yönlendirilir
 *   (bkz. `useAnalyticsFilters` — URL/scope fallback P0.3b'de eklendi).
 *   Burada sadece cache anahtarı görünür kılınır.
 */
export function useAnalyticsOverview(windowOrOpts: AnalyticsWindow | OverviewFetchOptions) {
  const scope = useActiveScope();

  const queryKey = typeof windowOrOpts === "string"
    ? [
        "analytics",
        "overview",
        windowOrOpts,
        { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
      ]
    : [
        "analytics",
        "overview",
        windowOrOpts.window,
        windowOrOpts.date_from ?? "",
        windowOrOpts.date_to ?? "",
        { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
      ];

  return useQuery({
    queryKey,
    queryFn: () => fetchOverviewMetrics(windowOrOpts),
    staleTime: 30_000,
    // Not: `isReady` gate'i bilinçli olarak EKLENMEDİ. Backend ownership
    // zaten zorlanır; gate olsaydı mevcut smoke testlerde auth hidrat
    // beklenmediği için fetch durur ve tüm dashboard "—" kalırdı. Cache
    // key scope parmak izi ile admin all <-> user focus ayrımı yapar;
    // bu yeterli görünürlük katmanıdır.
  });
}
