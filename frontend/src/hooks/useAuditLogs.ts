/**
 * Audit Log React Query hooks — M15.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs, fetchAuditLogDetail } from "../api/auditLogApi";

export function useAuditLogs(params?: {
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => fetchAuditLogs(params),
    staleTime: 15_000,
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
