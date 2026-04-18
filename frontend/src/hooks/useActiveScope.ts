/**
 * useActiveScope — Faz R5 / P0.2 (Redesign REV-2).
 *
 * Returns the EFFECTIVE scope for the current React tree:
 *
 * - User role:
 *     Always `{ ownerUserId: <self>, isAllUsers: false, mode: "user",
 *               role: "user" }`.
 *     Users never have "all users" access — backend enforces this, and
 *     this hook reflects the enforced truth.
 *
 * - Admin role:
 *     Reads `useAdminScopeStore`. Either:
 *       `{ ownerUserId: null, isAllUsers: true,  mode: "all",  role: "admin" }`
 *     or:
 *       `{ ownerUserId: "<uid>", isAllUsers: false, mode: "user", role: "admin" }`
 *
 * - Unauthenticated / still-hydrating:
 *     `{ ownerUserId: null, isAllUsers: false, mode: "unknown", role: null }`.
 *     Callers MUST treat "unknown" as a no-op gate: do not fire scope-bound
 *     queries until a real mode is resolved.
 *
 * Contract guarantees:
 * - `ownerUserId` is only non-null when you should actually filter by it.
 * - `isAllUsers` is only true for admins explicitly in "all" mode.
 * - The tuple `(ownerUserId, isAllUsers)` is suitable for direct use in
 *   React Query keys — it changes iff the effective scope changes, so
 *   cache contamination between users is impossible.
 *
 * CLAUDE.md alignment:
 * - Backend is the real enforcer. This hook never assumes authorization.
 * - No hidden behavior: the returned scope matches exactly what the UI
 *   will send to the server as `owner_user_id` / no-filter.
 *
 * Downstream consumers (P0.3+):
 * - Admin pages replace bare `useQuery({ queryKey: ["x"] })` with
 *   `useQuery({ queryKey: ["x", { ownerUserId }], queryFn: () => fetchX(isAllUsers ? {} : { owner_user_id: ownerUserId }) })`.
 */

import { useAdminScopeStore } from "../stores/adminScopeStore";
import { useCurrentUser } from "./useCurrentUser";

export type ActiveScopeRole = "admin" | "user" | null;
export type ActiveScopeMode = "all" | "user" | "unknown";

export interface ActiveScope {
  /** User id to filter by, or null when requesting "all users" / unknown. */
  ownerUserId: string | null;
  /** Shortcut: true iff admin looking at all users. */
  isAllUsers: boolean;
  /** "all" (admin-wide), "user" (single user), "unknown" (auth not ready). */
  mode: ActiveScopeMode;
  /** Resolved role, or null while auth is hydrating. */
  role: ActiveScopeRole;
  /** true iff scope is resolved enough to fire scope-bound queries. */
  isReady: boolean;
}

/**
 * Hook — returns the effective scope for query keys / fetch params.
 */
export function useActiveScope(): ActiveScope {
  const { user, isReady: userReady } = useCurrentUser();
  const adminMode = useAdminScopeStore((s) => s.mode);
  const adminFocusedUserId = useAdminScopeStore((s) => s.userId);

  if (!userReady || !user) {
    return {
      ownerUserId: null,
      isAllUsers: false,
      mode: "unknown",
      role: null,
      isReady: false,
    };
  }

  const role: ActiveScopeRole = user.role === "admin" ? "admin" : "user";

  if (role === "user") {
    // End-users never have "all" scope. Backend will reject any attempt.
    return {
      ownerUserId: user.id,
      isAllUsers: false,
      mode: "user",
      role: "user",
      isReady: true,
    };
  }

  // role === "admin"
  if (adminMode === "all") {
    return {
      ownerUserId: null,
      isAllUsers: true,
      mode: "all",
      role: "admin",
      isReady: true,
    };
  }

  // admin focused on a specific user
  if (adminMode === "user" && adminFocusedUserId) {
    return {
      ownerUserId: adminFocusedUserId,
      isAllUsers: false,
      mode: "user",
      role: "admin",
      isReady: true,
    };
  }

  // Defensive fallback: admin, but store has an invalid shape.
  // Treat as "all users" — admin default.
  return {
    ownerUserId: null,
    isAllUsers: true,
    mode: "all",
    role: "admin",
    isReady: true,
  };
}
