/**
 * Audit Log React Query hooks — M15.
 *
 * Redesign REV-2 / P0.3b:
 *   Audit yüzeyi admin-only; ownership backend'de sertleştirilmiş (Phase AL
 *   hardening sonrası /audit-logs/* leak kapatıldı). Burada sadece cache
 *   key'e `useActiveScope()` parmak izi eklenir — admin odağı değişince
 *   başka bir user'ın filtrelenmiş görünümüyle karışmasın.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs, fetchAuditLogDetail } from "../api/auditLogApi";
import { useActiveScope } from "./useActiveScope";

export function useAuditLogs(params?: {
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  const scope = useActiveScope();
  return useQuery({
    queryKey: [
      "audit-logs",
      params,
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () => fetchAuditLogs(params),
    staleTime: 15_000,
    // isReady gate eklenmedi — bkz. useAnalyticsOverview açıklaması.
  });
}

export function useAuditLogDetail(logId: string | null) {
  return useQuery({
    queryKey: ["audit-logs", logId],
    queryFn: () => fetchAuditLogDetail(logId!),
    enabled: !!logId,
    staleTime: 60_000,
  });
}
