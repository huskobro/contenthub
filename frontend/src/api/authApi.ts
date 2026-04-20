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

// ---------------------------------------------------------------------------
// Password reset — forgot & reset
// ---------------------------------------------------------------------------

export interface ForgotPasswordResponse {
  message: string;
  /**
   * Dev/localhost convenience: the server returns the reset token in the
   * response body when no email transport is configured, so the Aurora
   * forgot-password form can present the continuation link directly.
   * In production this field is null and the token arrives via email.
   */
  reset_token: string | null;
}

export interface ResetPasswordResponse {
  message: string;
}

export async function requestPasswordReset(
  email: string,
): Promise<ForgotPasswordResponse> {
  return authFetch<ForgotPasswordResponse>(`${AUTH_BASE}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResponse> {
  return authFetch<ResetPasswordResponse>(`${AUTH_BASE}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}
