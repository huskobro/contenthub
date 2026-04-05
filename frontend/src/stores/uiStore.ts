/**
 * UI Store — Wave 1
 *
 * Zustand store for client-only UI state.
 * Manages: sidebar collapse, toast queue.
 * Does NOT duplicate any server state (React Query handles that).
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Toast types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** Timestamp when toast was created — for auto-dismiss calculation */
  createdAt: number;
}

// ---------------------------------------------------------------------------
// UI State
// ---------------------------------------------------------------------------

interface UIState {
  // -- Sidebar --
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // -- Toast queue --
  toasts: Toast[];
  /** Add a toast. Deduplicates by message within 2s window. Max 5 visible. */
  addToast: (type: ToastType, message: string) => void;
  /** Remove a specific toast by id */
  removeToast: (id: string) => void;
  /** Clear all toasts */
  clearToasts: () => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  // -- Sidebar --
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // -- Toast queue --
  toasts: [],

  addToast: (type, message) => {
    const now = Date.now();
    const existing = get().toasts;

    // Spam prevention: skip if same message exists within last 2s
    const duplicate = existing.find(
      (t) => t.message === message && t.type === type && now - t.createdAt < 2000
    );
    if (duplicate) return;

    const id = `toast-${++toastCounter}-${now}`;
    const newToast: Toast = { id, type, message, createdAt: now };

    set((s) => ({
      // FIFO: keep max 5, newest at the end
      toasts: [...s.toasts.slice(-4), newToast],
    }));
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),
}));
