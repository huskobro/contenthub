/**
 * Auth Store (Zustand) — Faz 4.
 *
 * Manages JWT tokens and authenticated user identity.
 * Tokens are persisted to localStorage for session persistence.
 */

import { create } from "zustand";
import {
  loginApi,
  registerApi,
  refreshTokenApi,
  type TokenResponse,
} from "../api/authApi";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /**
   * Bootstrap flag — becomes `true` once the store has attempted to hydrate
   * itself from localStorage (synchronously during store creation).
   *
   * Route guards MUST wait for this to be `true` before making redirect
   * decisions. In a browser environment this flips to `true` on the very
   * first render (hydration happens inside the Zustand lazy initializer),
   * so the flag only matters for defensive guarding and for tests where
   * the store can be reset between cases.
   */
  hasHydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  /**
   * @deprecated Since the refresh-bootstrap fix, the store hydrates itself
   * synchronously inside the Zustand initializer. This method is retained
   * only for backward compatibility with older call sites and tests — it
   * is now a safe idempotent re-read from localStorage.
   */
  loadFromStorage: () => void;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  accessToken: "contenthub:access-token",
  refreshToken: "contenthub:refresh-token",
  user: "contenthub:auth-user",
} as const;

function persistTokens(data: TokenResponse) {
  try {
    localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
    localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
    const user: AuthUser = {
      id: data.user_id,
      email: "", // filled on /me call or login context
      display_name: data.display_name,
      role: data.role,
    };
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

    // Also sync active-user-id for the API client header (M40 compat)
    localStorage.setItem("contenthub:active-user-id", data.user_id);
  } catch {
    // localStorage not available
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
  } catch {
    // localStorage not available
  }
}

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Synchronously read the persisted auth snapshot from localStorage.
 *
 * Called once by the Zustand lazy initializer (and also by the legacy
 * `loadFromStorage` action). Returns a partial state blob that the store
 * can spread into its initial value so `isAuthenticated` is correct on
 * the very first render — no effect race, no guard bounce.
 *
 * Contract:
 *   - If access token, refresh token AND persisted user are all present
 *     and valid JSON → authenticated snapshot.
 *   - Anything else (missing, corrupt) → unauthenticated snapshot.
 *   - Never throws. Never mutates tokens — validation is the refresh
 *     interceptor's job on the first real request.
 */
function readAuthSnapshot(): {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
} {
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    const user = loadUser();
    if (accessToken && refreshToken && user) {
      return { accessToken, refreshToken, user, isAuthenticated: true };
    }
  } catch {
    // localStorage unavailable (SSR, private mode, tests) — fall through.
  }
  return { accessToken: null, refreshToken: null, user: null, isAuthenticated: false };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function applyTokenResponse(
  set: (partial: Partial<AuthState>) => void,
  data: TokenResponse,
  email?: string,
) {
  const user: AuthUser = {
    id: data.user_id,
    email: email ?? "",
    display_name: data.display_name,
    role: data.role,
  };
  persistTokens(data);
  // Also save email into the persisted user object
  if (email) {
    try {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } catch {
      // ignore
    }
  }
  set({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user,
    isAuthenticated: true,
  });

  // Phase Final F4 — cross-device theme persistence.
  // After successful auth, force-hydrate the theme from backend so a
  // different browser on the same account reflects the last chosen theme.
  // Late-bind the import to avoid a circular import with themeStore.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    void import("./themeStore").then((mod) => {
      try {
        mod.useThemeStore.getState().hydrateFromBackend({ force: true });
      } catch {
        // theme store not ready yet — safe to ignore
      }
    });
  } catch {
    // dynamic import unavailable — safe to ignore
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Synchronous hydration from localStorage happens HERE — inside the
  // Zustand lazy initializer — so `isAuthenticated` carries the correct
  // value on the very first render of any component that reads it.
  // This is the fix for the F5/refresh-bounce bug where useEffect-based
  // hydration lost the race against route guards.
  const snapshot = readAuthSnapshot();

  return {
    accessToken: snapshot.accessToken,
    refreshToken: snapshot.refreshToken,
    user: snapshot.user,
    isAuthenticated: snapshot.isAuthenticated,
    hasHydrated: true,

    login: async (email, password) => {
      const data = await loginApi(email, password);
      applyTokenResponse(set, data, email);
    },

    register: async (email, password, displayName) => {
      const data = await registerApi(email, password, displayName);
      applyTokenResponse(set, data, email);
    },

    logout: () => {
      clearStorage();
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        // hasHydrated stays `true` — logout does not un-bootstrap the store.
      });
    },

    refreshAuth: async () => {
      const rt = get().refreshToken;
      if (!rt) {
        get().logout();
        return;
      }
      try {
        const data = await refreshTokenApi(rt);
        applyTokenResponse(set, data, get().user?.email);
      } catch {
        get().logout();
      }
    },

    /**
     * Legacy idempotent re-read. The store already hydrates synchronously
     * inside the Zustand initializer — this method exists for backward
     * compatibility with any caller (or test) that still invokes it.
     */
    loadFromStorage: () => {
      const fresh = readAuthSnapshot();
      set({
        accessToken: fresh.accessToken,
        refreshToken: fresh.refreshToken,
        user: fresh.user,
        isAuthenticated: fresh.isAuthenticated,
      });
    },
  };
});
