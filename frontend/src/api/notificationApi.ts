/**
 * Notification Center API — Faz 16.
 *
 * Backend-backed notification CRUD + count.
 */

import { api } from "./client";

const BASE = "/api/v1/notifications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: string;
  owner_user_id: string | null;
  scope_type: string; // user | admin | system
  notification_type: string;
  title: string;
  body: string | null;
  severity: string; // info | warning | error | success
  status: string; // unread | read | dismissed
  related_entity_type: string | null;
  related_entity_id: string | null;
  related_inbox_item_id: string | null;
  related_channel_profile_id: string | null;
  action_url: string | null;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export interface NotificationCount {
  unread: number;
  total: number;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export function fetchNotifications(params?: {
  owner_user_id?: string;
  scope_type?: string;
  status?: string;
  notification_type?: string;
  severity?: string;
  channel_profile_id?: string;
  limit?: number;
  offset?: number;
}): Promise<NotificationItem[]> {
  return api.get<NotificationItem[]>(BASE, params);
}

export function fetchNotificationCount(params?: {
  owner_user_id?: string;
  scope_type?: string;
}): Promise<NotificationCount> {
  return api.get<NotificationCount>(`${BASE}/count`, params);
}

export function markNotificationRead(id: string): Promise<NotificationItem> {
  return api.patch<NotificationItem>(`${BASE}/${id}`, { status: "read" });
}

export function markNotificationDismissed(id: string): Promise<NotificationItem> {
  return api.patch<NotificationItem>(`${BASE}/${id}`, { status: "dismissed" });
}

export function markAllNotificationsRead(params?: {
  owner_user_id?: string;
  scope_type?: string;
}): Promise<{ marked_read: number }> {
  return api.post<{ marked_read: number }>(
    `${BASE}/mark-all-read${params ? "?" + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][]
    ).toString() : ""}`,
  );
}
