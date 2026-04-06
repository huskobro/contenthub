/**
 * Audit Log API client — M15.
 */

import { api } from "./client";

const BASE = "/api/v1/audit-logs";

export interface AuditLogEntry {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details_json: string;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
}

export function fetchAuditLogs(params?: {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogListResponse> {
  return api.get<AuditLogListResponse>(BASE, params);
}

export function fetchAuditLogDetail(logId: string): Promise<AuditLogEntry> {
  return api.get<AuditLogEntry>(`${BASE}/${encodeURIComponent(logId)}`);
}
