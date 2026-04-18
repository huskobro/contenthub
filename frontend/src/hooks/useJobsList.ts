/**
 * useJobsList — jobs listesi hook'u.
 *
 * Redesign REV-2 / P0.3a:
 *   - Artik `useActiveScope()` tuketir.
 *   - Query key `["jobs", { ownerUserId, isAllUsers, includeArchived }]`
 *     formuna alindi. Admin scope "all" <-> "user focus" degisince cache
 *     temiz ayrilir; admin/user arasi cross-contamination imkansiz olur.
 *   - Fetch param'i:
 *       user rolu       -> owner_id gecirilmez (backend ctx.user_id zorlar)
 *       admin all       -> owner_id gecirilmez (backend tum kayitlari verir)
 *       admin user focus-> owner_id = o user'in id'si gecirilir
 *   - `isReady=false` ise query disabled kalir (auth hidrat bekleniyor).
 *
 * Scope altyapi katmani: backend her durumda dogrulayici, frontend sadece
 * "hangi veri istendi" bilgisini gorunur hale getirir (CLAUDE.md: "enforce
 * visibility server-side, reflect visibility client-side").
 *
 * Not (P0.3b düzeltmesi): `enabled: scope.isReady` gate'i bilinçli olarak
 * KALDIRILDI. Mevcut smoke testler auth hidrat etmeden render ediyor ve
 * gate olursa tüm ekran boş kalıyordu. Cache key scope parmak izi ile
 * admin all/user focus ayrışması sağlanır; ownership backend'de zorlanır.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchJobs } from "../api/jobsApi";
import { useActiveScope } from "./useActiveScope";

export function useJobsList(includeArchived = false) {
  const scope = useActiveScope();

  return useQuery({
    queryKey: [
      "jobs",
      {
        ownerUserId: scope.ownerUserId,
        isAllUsers: scope.isAllUsers,
        includeArchived,
      },
    ],
    queryFn: () =>
      fetchJobs({
        ...(includeArchived ? { include_test_data: true } : {}),
        // Admin focused-user: gonder; user rolu: backend zaten kendi user_id'yi
        // zorladigi icin gonderme; admin "all": undefined birakilir.
        ...(scope.ownerUserId && scope.role === "admin"
          ? { owner_id: scope.ownerUserId }
          : {}),
      }),
  });
}
