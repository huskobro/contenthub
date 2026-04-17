/**
 * useCurrentUser — Faz R5 / P0.1 (Redesign REV-2).
 *
 * Single source of truth for the CURRENT user's profile in the UI.
 *
 * Responsibilities:
 * - Bridge `useAuthStore` (which owns tokens + lightweight identity) with
 *   React Query cache for the full `/api/v1/auth/me` profile.
 * - Serve as the authoritative hook consumed by:
 *   - UserIdentityStrip (P1.2)
 *   - AdminScopeSwitcher fallback (P1.1)
 *   - useActiveScope derivation (P0.2)
 *   - Digest dashboards and any page that needs "who am I" data.
 *
 * Contract:
 * - Never returns stale identity after logout (enabled=false when no token).
 * - Never duplicates server truth in Zustand — the detailed profile lives in
 *   React Query cache only; the auth store still owns tokens + role chip.
 * - Settings-Registry-free. CLAUDE.md non-negotiable: no hidden behavior.
 *
 * This hook is intentionally small and has NO direct consumer at creation
 * time — P0.2+ will consume it. Introducing it first lets us land an
 * isolated unit test without touching page code.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchMe, type UserInfo } from "../api/authApi";
import { useAuthStore } from "../stores/authStore";

/**
 * Stable React Query key for the current user profile.
 * Exported so tests / invalidation helpers can reuse it.
 */
export const CURRENT_USER_QUERY_KEY = ["auth", "me"] as const;

export interface UseCurrentUserResult {
  /** Full profile from /api/v1/auth/me, or null while loading / unauthenticated. */
  user: UserInfo | null;
  /** true while the /me request is in flight. */
  isLoading: boolean;
  /** true once a successful /me response is cached. */
  isReady: boolean;
  /** Any error surfaced by the /me request (network, 401, etc.). */
  error: unknown;
  /** Raw React Query result for advanced consumers (refetch, status, etc.). */
  query: UseQueryResult<UserInfo, unknown>;
}

/**
 * Hook — returns the current user's profile.
 *
 * Behavior:
 * - If no access token is present in the auth store, the query is disabled
 *   and `user` stays null (no network traffic).
 * - Otherwise fetches `/api/v1/auth/me` once and caches for 5 minutes.
 * - Does NOT attempt silent refresh on 401 — that remains the auth store's
 *   job; this hook simply surfaces the error for the caller to react to.
 */
export function useCurrentUser(): UseCurrentUserResult {
  const accessToken = useAuthStore((s) => s.accessToken);

  const query = useQuery<UserInfo, unknown>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => {
      if (!accessToken) {
        // Should not happen because `enabled` gates this, but we keep a
        // fail-fast guard to avoid an accidental anonymous /me call.
        return Promise.reject(new Error("useCurrentUser: no access token"));
      }
      return fetchMe(accessToken);
    },
    enabled: Boolean(accessToken),
    staleTime: 5 * 60 * 1000, // 5 min — /me is cheap and rarely changes
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, err) => {
      // Never retry a 401: auth store owns refresh. Other errors: 1 retry.
      const message = err instanceof Error ? err.message : String(err);
      if (/401|unauthori/i.test(message)) return false;
      return failureCount < 1;
    },
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isReady: query.isSuccess,
    error: query.error,
    query,
  };
}
