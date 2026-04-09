/**
 * useNotifications — Backend-backed notification data hook — Faz 16.
 *
 * Fetches notifications from the backend API and syncs to Zustand store.
 * Provides mutation helpers for read/dismiss actions.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  fetchNotifications,
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
  scope_type?: string;
  owner_user_id?: string;
}) {
  const qc = useQueryClient();
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const storeMarkAsRead = useNotificationStore((s) => s.markAsRead);
  const storeMarkAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  // Fetch notifications from backend
  const notifQuery = useQuery({
    queryKey: ["notifications", params?.scope_type, params?.owner_user_id],
    queryFn: () => fetchNotifications({
      scope_type: params?.scope_type,
      owner_user_id: params?.owner_user_id,
      limit: 100,
    }),
    refetchInterval: 30_000, // 30s fallback polling (SSE is primary)
    staleTime: 10_000,
  });

  // Fetch unread count
  const countQuery = useQuery({
    queryKey: ["notification-count", params?.scope_type, params?.owner_user_id],
    queryFn: () => fetchNotificationCount({
      scope_type: params?.scope_type,
      owner_user_id: params?.owner_user_id,
    }),
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
    mutationFn: () => markAllNotificationsRead({
      scope_type: params?.scope_type,
      owner_user_id: params?.owner_user_id,
    }),
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
