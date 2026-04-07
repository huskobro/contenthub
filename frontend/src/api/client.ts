/**
 * Centralized API client — single source of truth for all HTTP calls.
 * Replaces duplicated fetch + error handling across 21 API files.
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

function getActiveUserHeaders(): Record<string, string> {
  try {
    const userId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (userId && userId.length >= 32) {
      return { "X-ContentHub-User-Id": userId };
    }
  } catch {
    // localStorage not available
  }
  return {};
}

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
};
