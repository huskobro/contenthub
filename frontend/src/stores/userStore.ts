/**
 * User Store (Zustand) — M40.
 *
 * Manages active user identity for multi-user switching.
 * activeUserId is persisted to localStorage so the system remembers
 * the last active user across sessions and browser refreshes.
 *
 * This store only holds the active user ID. The user list comes from
 * React Query (useUsers hook). This prevents duplicating server state.
 */

import { create } from "zustand";

const STORAGE_KEY = "contenthub:active-user-id";

interface UserState {
  /** Currently active user ID — null if no user selected */
  activeUserId: string | null;

  /** Set the active user and persist to localStorage */
  setActiveUser: (userId: string | null) => void;
}

function loadActiveUserId(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && stored.length >= 32 ? stored : null;
  } catch {
    return null;
  }
}

export const useUserStore = create<UserState>((set) => ({
  activeUserId: loadActiveUserId(),

  setActiveUser: (userId) => {
    set({ activeUserId: userId });
    try {
      if (userId) {
        localStorage.setItem(STORAGE_KEY, userId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage not available — silent fallback
    }
  },
}));
