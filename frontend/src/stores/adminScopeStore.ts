/**
 * Admin Scope Store — Faz R5 / P0.2 (Redesign REV-2).
 *
 * Controls the ADMIN-side "active scope" UI state:
 * - mode="all": admin is looking across every user (default).
 * - mode="user": admin has focused on a specific user (userId).
 *
 * This is CLIENT-ONLY state. It does NOT authorize anything — backend
 * still enforces ownership via UserContext + apply_user_scope on every
 * endpoint. The store only drives:
 *   1. Query key discrimination (user A vs user B cache stays separate).
 *   2. UI affordances (scope chip, switcher, "kullanıcı: X" overlays).
 *
 * Persisted to localStorage so admins can reload without losing their
 * focused-user context. Restoring uses a versioned shape to allow safe
 * future migration.
 *
 * CLAUDE.md alignment:
 * - No hidden behavior: the scope is always visible via AdminScopeSwitcher.
 * - No hardcoded defaults: mode defaults to "all" (explicit), userId null.
 * - No parallel pattern: this is the single source for admin scope UI state.
 * - Zustand (client-only UI state) — server state stays in React Query.
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "contenthub:admin-scope";
const STORAGE_VERSION = 1;

export type AdminScopeMode = "all" | "user";

export interface AdminScopeState {
  mode: AdminScopeMode;
  /** Non-null only when mode === "user". Stored as string user id (UUID). */
  userId: string | null;
  /** true once the store attempted localStorage hydration. */
  hasHydrated: boolean;

  /** Switch to "all users" view. */
  setAll: () => void;
  /** Focus on a specific user. */
  focusUser: (userId: string) => void;
  /** Clear + return to "all users" (alias for setAll, kept for readability). */
  clear: () => void;
  /** Force-rehydrate from storage (idempotent; mostly useful for tests). */
  loadFromStorage: () => void;
}

interface StoredShape {
  v: number;
  mode: AdminScopeMode;
  userId: string | null;
}

function loadFromStorage():
  | { mode: AdminScopeMode; userId: string | null }
  | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredShape;
    if (!parsed || parsed.v !== STORAGE_VERSION) return null;
    if (parsed.mode !== "all" && parsed.mode !== "user") return null;
    if (parsed.mode === "user" && typeof parsed.userId !== "string") return null;
    return {
      mode: parsed.mode,
      userId: parsed.mode === "user" ? parsed.userId : null,
    };
  } catch {
    return null;
  }
}

function persistToStorage(mode: AdminScopeMode, userId: string | null): void {
  try {
    const payload: StoredShape = {
      v: STORAGE_VERSION,
      mode,
      userId: mode === "user" ? userId : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (SSR, private mode) — ignore.
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAdminScopeStore = create<AdminScopeState>((set, get) => {
  const initial = loadFromStorage();
  return {
    mode: initial?.mode ?? "all",
    userId: initial?.userId ?? null,
    hasHydrated: true,

    setAll: () => {
      set({ mode: "all", userId: null });
      persistToStorage("all", null);
    },

    focusUser: (userId: string) => {
      if (!userId) return;
      set({ mode: "user", userId });
      persistToStorage("user", userId);
    },

    clear: () => {
      set({ mode: "all", userId: null });
      persistToStorage("all", null);
    },

    loadFromStorage: () => {
      const data = loadFromStorage();
      set({
        mode: data?.mode ?? "all",
        userId: data?.userId ?? null,
        hasHydrated: true,
      });
      // Intentionally do NOT re-persist here — this is a pure read.
      void get;
    },
  };
});

/**
 * Test / reset helper. NOT part of public API. Use only in vitest setup.
 */
export function __resetAdminScopeStoreForTests(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  useAdminScopeStore.setState({
    mode: "all",
    userId: null,
    hasHydrated: true,
  });
}
