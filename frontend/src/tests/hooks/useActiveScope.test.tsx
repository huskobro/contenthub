/**
 * useActiveScope unit tests — Faz R5 / P0.2 (Redesign REV-2).
 *
 * Verifies the scope derivation matrix:
 *   auth state    × adminScopeStore state        → ActiveScope
 *
 * Cases:
 * 1. Unauthenticated / no token         → mode="unknown", isReady=false
 * 2. Auth ready, role="user"            → ownerUserId=self, isAllUsers=false
 * 3. Auth ready, role="admin", mode=all → ownerUserId=null, isAllUsers=true
 * 4. Auth ready, role="admin", mode=user+uid → ownerUserId=uid, isAllUsers=false
 * 5. Auth ready, role="admin", mode=user BUT no uid (defensive fallback) → all
 *
 * Contract guarantees re-verified:
 * - User role NEVER gets isAllUsers=true (even if store is corrupted).
 * - `mode="unknown"` gates scope-bound queries at caller side.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useActiveScope } from "../../hooks/useActiveScope";
import {
  useAdminScopeStore,
  __resetAdminScopeStoreForTests,
} from "../../stores/adminScopeStore";
import { useAuthStore } from "../../stores/authStore";
import * as authApi from "../../api/authApi";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function primeAuthStore(opts: {
  accessToken: string | null;
  role?: "admin" | "user";
  userId?: string;
}) {
  const { accessToken, role = "user", userId = "u-self" } = opts;
  useAuthStore.setState({
    accessToken,
    refreshToken: accessToken ? "refresh" : null,
    user: accessToken
      ? { id: userId, email: `${userId}@test.local`, display_name: userId, role }
      : null,
    isAuthenticated: Boolean(accessToken),
    hasHydrated: true,
  });
}

function primeFetchMe(profile: authApi.UserInfo) {
  return vi.spyOn(authApi, "fetchMe").mockResolvedValue(profile);
}

describe("useActiveScope", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetAdminScopeStoreForTests();
  });

  afterEach(() => {
    primeAuthStore({ accessToken: null });
    __resetAdminScopeStoreForTests();
  });

  it("returns mode=unknown, isReady=false while unauthenticated", () => {
    primeAuthStore({ accessToken: null });

    const { result } = renderHook(() => useActiveScope(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mode).toBe("unknown");
    expect(result.current.role).toBeNull();
    expect(result.current.ownerUserId).toBeNull();
    expect(result.current.isAllUsers).toBe(false);
    expect(result.current.isReady).toBe(false);
  });

  it("returns self-scoped result for a regular user (never isAllUsers)", async () => {
    primeFetchMe({
      id: "u-7",
      email: "user@test.local",
      display_name: "User",
      role: "user",
      status: "active",
    });
    primeAuthStore({ accessToken: "t-user", role: "user", userId: "u-7" });
    // Even if store was corrupted into "all", user role must override.
    useAdminScopeStore.setState({ mode: "user", userId: "u-hacked", hasHydrated: true });

    const { result } = renderHook(() => useActiveScope(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.role).toBe("user");
    expect(result.current.mode).toBe("user");
    expect(result.current.ownerUserId).toBe("u-7");
    expect(result.current.isAllUsers).toBe(false);
  });

  it("returns all-users scope for admin with mode=all", async () => {
    primeFetchMe({
      id: "a-1",
      email: "admin@test.local",
      display_name: "Admin",
      role: "admin",
      status: "active",
    });
    primeAuthStore({ accessToken: "t-admin", role: "admin", userId: "a-1" });
    useAdminScopeStore.getState().setAll();

    const { result } = renderHook(() => useActiveScope(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.role).toBe("admin");
    expect(result.current.mode).toBe("all");
    expect(result.current.ownerUserId).toBeNull();
    expect(result.current.isAllUsers).toBe(true);
  });

  it("returns focused-user scope for admin with mode=user + userId", async () => {
    primeFetchMe({
      id: "a-1",
      email: "admin@test.local",
      display_name: "Admin",
      role: "admin",
      status: "active",
    });
    primeAuthStore({ accessToken: "t-admin", role: "admin", userId: "a-1" });
    useAdminScopeStore.getState().focusUser("target-user");

    const { result } = renderHook(() => useActiveScope(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.role).toBe("admin");
    expect(result.current.mode).toBe("user");
    expect(result.current.ownerUserId).toBe("target-user");
    expect(result.current.isAllUsers).toBe(false);
  });

  it("falls back to all-users for admin when store has mode=user but no userId", async () => {
    primeFetchMe({
      id: "a-1",
      email: "admin@test.local",
      display_name: "Admin",
      role: "admin",
      status: "active",
    });
    primeAuthStore({ accessToken: "t-admin", role: "admin", userId: "a-1" });
    // Manually force a pathological state the store's own setters would refuse.
    useAdminScopeStore.setState({ mode: "user", userId: null, hasHydrated: true });

    const { result } = renderHook(() => useActiveScope(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.role).toBe("admin");
    expect(result.current.mode).toBe("all");
    expect(result.current.ownerUserId).toBeNull();
    expect(result.current.isAllUsers).toBe(true);
  });
});
