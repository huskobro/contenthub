/**
 * Centralized API client — single source of truth for all HTTP calls.
 * Replaces duplicated fetch + error handling across 21 API files.
 *
 * Sprint 2: 401 auto-refresh interceptor added.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg;
    return `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryParams = Record<string, any>;

function buildUrl(
  base: string,
  params?: QueryParams,
): string {
  if (!params) return base;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Inject X-ContentHub-User-Id header from localStorage (M40).
 * Reads directly from localStorage to avoid circular dependency with userStore.
 * The userStore and localStorage share the same key — always in sync.
 */
const USER_ID_STORAGE_KEY = "contenthub:active-user-id";
const ACCESS_TOKEN_KEY = "contenthub:access-token";
const REFRESH_TOKEN_KEY = "contenthub:refresh-token";
const AUTH_USER_KEY = "contenthub:auth-user";

/** Dev bypass — auth tamamen pasif, her zaman admin user-id gönderir */
const AUTH_DISABLED = true;
const DEV_ADMIN_USER_ID = "f423e3c7-40a7-4cc5-bac5-0b9e00711933";

function getActiveUserHeaders(): Record<string, string> {
  if (AUTH_DISABLED) {
    return { "X-ContentHub-User-Id": DEV_ADMIN_USER_ID };
  }
  const headers: Record<string, string> = {};
  try {
    const userId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (userId && userId.length >= 32) {
      headers["X-ContentHub-User-Id"] = userId;
    }
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // localStorage not available
  }
  return headers;
}

// ---------------------------------------------------------------------------
// 401 Auto-Refresh Interceptor — Sprint 2
// ---------------------------------------------------------------------------

/** Prevents concurrent refresh attempts across parallel requests. */
let _isRefreshing = false;
let _refreshPromise: Promise<boolean> | null = null;

/**
 * Clear all auth tokens and redirect to /login.
 * Safe to call multiple times — idempotent.
 */
function forceLogout(): void {
  if (AUTH_DISABLED) return; // Dev bypass — login'e yönlendirme yapma
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(USER_ID_STORAGE_KEY);
  } catch {
    /* ignore — localStorage may be unavailable */
  }
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if refresh succeeded, false otherwise.
 * Concurrent callers share the same in-flight promise.
 */
function doRefresh(): Promise<boolean> {
  if (_isRefreshing && _refreshPromise) return _refreshPromise;

  _isRefreshing = true;
  _refreshPromise = (async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        forceLogout();
        return false;
      }

      // Call refresh endpoint directly with fetch to avoid recursion
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        forceLogout();
        return false;
      }

      const data = await res.json();
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      return true;
    } catch {
      forceLogout();
      return false;
    } finally {
      _isRefreshing = false;
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/**
 * On 401, attempt token refresh then retry the original request once.
 * If refresh fails, forces logout.
 */
async function tryRefreshAndRetry<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const ok = await doRefresh();
  if (!ok) {
    throw new ApiError("Session expired", 401, "Session expired");
  }

  // Retry original request with fresh headers
  const freshHeaders = getActiveUserHeaders();
  const mergedHeaders = {
    ...freshHeaders,
    ...(options?.headers as Record<string, string>),
  };
  const retryRes = await fetch(url, { ...options, headers: mergedHeaders });
  if (!retryRes.ok) {
    const detail = await parseErrorDetail(retryRes);
    throw new ApiError(detail, retryRes.status, detail);
  }
  return retryRes.json();
}

// ---------------------------------------------------------------------------
// Core request functions
// ---------------------------------------------------------------------------

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const userHeaders = getActiveUserHeaders();
  const mergedHeaders = {
    ...userHeaders,
    ...(options?.headers as Record<string, string>),
  };
  const res = await fetch(url, { ...options, headers: mergedHeaders });
  if (res.status === 401) {
    return tryRefreshAndRetry<T>(url, options);
  }
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new ApiError(detail, res.status, detail);
  }
  return res.json();
}

async function requestNullable<T>(
  url: string,
  options?: RequestInit,
): Promise<T | null> {
  const userHeaders = getActiveUserHeaders();
  const mergedHeaders = {
    ...userHeaders,
    ...(options?.headers as Record<string, string>),
  };
  const res = await fetch(url, { ...options, headers: mergedHeaders });
  if (res.status === 404) return null;
  if (res.status === 401) {
    return tryRefreshAndRetry<T>(url, options);
  }
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new ApiError(detail, res.status, detail);
  }
  return res.json();
}

export const api = {
  get<T>(base: string, params?: QueryParams): Promise<T> {
    return request<T>(buildUrl(base, params));
  },

  getOrNull<T>(base: string): Promise<T | null> {
    return requestNullable<T>(base);
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: "POST",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(url: string, body: unknown): Promise<T> {
    return request<T>(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  put<T>(url: string, body: unknown): Promise<T> {
    return request<T>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  delete<T>(url: string): Promise<T> {
    return request<T>(url, { method: "DELETE" });
  },

  /** For multipart uploads (no JSON content-type) */
  upload<T>(url: string, formData: FormData): Promise<T> {
    return request<T>(url, { method: "POST", body: formData });
  },

  /**
   * Raw text GET — returns response body as plain text instead of parsing
   * JSON. Used by export endpoints that emit CSV.
   */
  async getText(base: string, params?: QueryParams): Promise<string> {
    const url = buildUrl(base, params);
    const userHeaders = getActiveUserHeaders();
    const res = await fetch(url, { headers: userHeaders });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(detail, res.status, detail);
    }
    return res.text();
  },
};
