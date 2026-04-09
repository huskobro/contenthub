/**
 * Notification Store — Faz 16: Backend-backed notification center
 *
 * Zustand store for managing notification panel UI state.
 * Notifications are stored in the backend (NotificationItem table).
 * This store manages:
 *   - panel open/close state
 *   - local cache of notifications (synced via React Query externally)
 *   - SSE-driven real-time additions
 *
 * Difference from Toast:
 * - Toasts are transient (auto-dismiss in 4s)
 * - Notifications persist in DB until user reads/dismisses them
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** ISO timestamp */
  createdAt: string;
  read: boolean;
  /** Optional link to navigate to */
  link?: string;
  /** Source category */
  category?: "job" | "publish" | "system" | "content" | "source";
  /** Backend notification ID (if backend-backed) */
  backendId?: string;
  /** Related inbox item ID */
  relatedInboxItemId?: string;
}

// ---------------------------------------------------------------------------
// Severity → NotificationType mapping
// ---------------------------------------------------------------------------

export function severityToType(severity: string): NotificationType {
  switch (severity) {
    case "error": return "error";
    case "warning": return "warning";
    case "success": return "success";
    default: return "info";
  }
}

export function notificationTypeToCategory(
  notifType: string,
): "job" | "publish" | "system" | "content" | "source" | undefined {
  if (notifType.startsWith("render_") || notifType.startsWith("job_")) return "job";
  if (notifType.startsWith("publish_")) return "publish";
  if (notifType.startsWith("source_")) return "source";
  if (notifType === "system_info") return "system";
  return undefined;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const MAX_NOTIFICATIONS = 100;

interface NotificationState {
  notifications: Notification[];
  /** Is the notification panel open */
  panelOpen: boolean;
  /** Count of unread notifications */
  unreadCount: () => number;
  /** Open/close the panel */
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  /** Add a notification (from SSE or local event) */
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  /** Replace entire notification list (from backend fetch) */
  setNotifications: (items: Notification[]) => void;
  /** Mark one as read (local state) */
  markAsRead: (id: string) => void;
  /** Mark all as read (local state) */
  markAllAsRead: () => void;
  /** Remove one notification (local state) */
  removeNotification: (id: string) => void;
  /** Clear all notifications (local state) */
  clearAll: () => void;
}

let notifCounter = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  panelOpen: false,

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  addNotification: (n) => {
    const id = n.backendId || `notif-${++notifCounter}-${Date.now()}`;
    const notification: Notification = {
      ...n,
      id,
      createdAt: new Date().toISOString(),
      read: false,
    };
    set((s) => {
      // Dedupe: don't add if same backendId already exists
      if (n.backendId && s.notifications.some((x) => x.backendId === n.backendId)) {
        return s;
      }
      const next = [notification, ...s.notifications].slice(0, MAX_NOTIFICATIONS);
      return { notifications: next };
    });
  },

  setNotifications: (items) => {
    set({ notifications: items.slice(0, MAX_NOTIFICATIONS) });
  },

  markAsRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id || n.backendId === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllAsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  removeNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id && n.backendId !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));
