/**
 * Audit Log API client — M15.
 */

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

export async function fetchAuditLogs(params?: {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogListResponse> {
  const qs = new URLSearchParams();
  if (params?.action) qs.set("action", params.action);
  if (params?.entity_type) qs.set("entity_type", params.entity_type);
  if (params?.entity_id) qs.set("entity_id", params.entity_id);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`${BASE}${suffix}`);
  if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.status}`);
  return res.json();
}

export async function fetchAuditLogDetail(logId: string): Promise<AuditLogEntry> {
  const res = await fetch(`${BASE}/${encodeURIComponent(logId)}`);
  if (!res.ok) throw new Error(`Failed to fetch audit log detail: ${res.status}`);
  return res.json();
}
