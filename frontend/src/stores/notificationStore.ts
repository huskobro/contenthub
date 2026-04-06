/**
 * Notification Store — Persistent notification center
 *
 * Zustand store for managing notifications (not toasts).
 * Notifications persist in the panel until dismissed.
 * Integrates with SSE events for real-time notifications.
 *
 * Difference from Toast:
 * - Toasts are transient (auto-dismiss in 4s)
 * - Notifications persist until user reads/dismisses them
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
}

// ---------------------------------------------------------------------------
// LocalStorage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "contenthub:notifications";
const MAX_NOTIFICATIONS = 50;

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_NOTIFICATIONS) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // silently fail
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

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
  /** Add a notification */
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  /** Mark one as read */
  markAsRead: (id: string) => void;
  /** Mark all as read */
  markAllAsRead: () => void;
  /** Remove one notification */
  removeNotification: (id: string) => void;
  /** Clear all notifications */
  clearAll: () => void;
}

let notifCounter = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: loadNotifications(),
  panelOpen: false,

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  addNotification: (n) => {
    const id = `notif-${++notifCounter}-${Date.now()}`;
    const notification: Notification = {
      ...n,
      id,
      createdAt: new Date().toISOString(),
      read: false,
    };
    set((s) => {
      const next = [notification, ...s.notifications].slice(0, MAX_NOTIFICATIONS);
      saveNotifications(next);
      return { notifications: next };
    });
  },

  markAsRead: (id) => {
    set((s) => {
      const next = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(next);
      return { notifications: next };
    });
  },

  markAllAsRead: () => {
    set((s) => {
      const next = s.notifications.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return { notifications: next };
    });
  },

  removeNotification: (id) => {
    set((s) => {
      const next = s.notifications.filter((n) => n.id !== id);
      saveNotifications(next);
      return { notifications: next };
    });
  },

  clearAll: () => {
    set({ notifications: [] });
    saveNotifications([]);
  },
}));
