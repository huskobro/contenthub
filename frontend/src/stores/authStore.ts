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

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
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
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

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

  loadFromStorage: () => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
      const user = loadUser();
      if (accessToken && refreshToken && user) {
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        });
      }
    } catch {
      // localStorage not available
    }
  },
}));
