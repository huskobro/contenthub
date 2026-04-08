/**
 * Auth API — Faz 4.
 *
 * Login, register, refresh, and /me endpoints.
 * Uses raw fetch (not api client) to avoid circular auth header dependency.
 */

const AUTH_BASE = "/api/v1/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  role: string;
  display_name: string;
}

export interface UserInfo {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function authFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function loginApi(
  email: string,
  password: string,
): Promise<TokenResponse> {
  return authFetch<TokenResponse>(`${AUTH_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(
  email: string,
  password: string,
  displayName: string,
): Promise<TokenResponse> {
  return authFetch<TokenResponse>(`${AUTH_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
}

export async function refreshTokenApi(
  refreshToken: string,
): Promise<TokenResponse> {
  return authFetch<TokenResponse>(`${AUTH_BASE}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function fetchMe(accessToken: string): Promise<UserInfo> {
  return authFetch<UserInfo>(`${AUTH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
