/**
 * useNotifications — Backend-backed notification data hook — Faz 16 + 16a scope closure.
 *
 * Fetches notifications from the backend API and syncs to Zustand store.
 * Provides mutation helpers for read/dismiss actions.
 *
 * Scope modes:
 *   - mode="user" → fetches /notifications/my (current user's notifications only)
 *   - mode="admin" → fetches /notifications (all, admin-facing)
 *   - default → fetches /notifications/my (safe default)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  fetchNotifications,
  fetchMyNotifications,
  fetchNotificationCount,
  markNotificationRead,
  markNotificationDismissed,
  markAllNotificationsRead,
} from "../api/notificationApi";
import type { NotificationItem } from "../api/notificationApi";
import {
  useNotificationStore,
  severityToType,
  notificationTypeToCategory,
} from "../stores/notificationStore";
import type { Notification } from "../stores/notificationStore";

function backendToLocal(item: NotificationItem): Notification {
  return {
    id: item.id,
    type: severityToType(item.severity),
    title: item.title,
    message: item.body || "",
    createdAt: item.created_at,
    read: item.status !== "unread",
    link: item.action_url || undefined,
    category: notificationTypeToCategory(item.notification_type),
    backendId: item.id,
    relatedInboxItemId: item.related_inbox_item_id || undefined,
  };
}

export function useNotifications(params?: {
  mode?: "user" | "admin";
}) {
  const mode = params?.mode ?? "user";
  const qc = useQueryClient();
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const storeMarkAsRead = useNotificationStore((s) => s.markAsRead);
  const storeMarkAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  // Fetch notifications from backend — scope-aware
  const notifQuery = useQuery({
    queryKey: ["notifications", mode],
    queryFn: () => {
      if (mode === "admin") {
        return fetchNotifications({ limit: 100 });
      }
      // User mode: fetch only my notifications
      return fetchMyNotifications({ limit: 100 });
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // Fetch unread count — scope-aware
  const countQuery = useQuery({
    queryKey: ["notification-count", mode],
    queryFn: () => {
      if (mode === "admin") {
        return fetchNotificationCount();
      }
      // User mode: count only my notifications
      return fetchNotificationCount({ mode: "my" });
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  // Sync backend data to Zustand store
  useEffect(() => {
    if (notifQuery.data) {
      const mapped = notifQuery.data.map(backendToLocal);
      setNotifications(mapped);
    }
  }, [notifQuery.data, setNotifications]);

  // Mark read mutation
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_data, id) => {
      storeMarkAsRead(id);
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  // Mark dismissed mutation
  const dismissMutation = useMutation({
    mutationFn: markNotificationDismissed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  // Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      storeMarkAllAsRead();
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  return {
    notifications: notifQuery.data || [],
    unreadCount: countQuery.data?.unread ?? 0,
    totalCount: countQuery.data?.total ?? 0,
    isLoading: notifQuery.isLoading,
    markRead: (id: string) => markReadMutation.mutate(id),
    dismiss: (id: string) => dismissMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}
