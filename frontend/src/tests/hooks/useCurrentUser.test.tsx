/**
 * useCurrentUser unit tests — Faz R5 / P0.1.
 *
 * Verifies:
 * 1. Disabled state when no access token (no network, user=null, isReady=false).
 * 2. Enabled state when access token present (calls fetchMe, exposes profile).
 * 3. Error state when fetchMe rejects.
 * 4. Query key stability (exported CURRENT_USER_QUERY_KEY).
 * 5. No-retry on 401 (auth store handles refresh, not this hook).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import {
  useCurrentUser,
  CURRENT_USER_QUERY_KEY,
} from "../../hooks/useCurrentUser";
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

function resetAuthStore(accessToken: string | null) {
  useAuthStore.setState({
    accessToken,
    refreshToken: null,
    user: accessToken
      ? { id: "u1", email: "u1@test.local", display_name: "User One", role: "user" }
      : null,
    isAuthenticated: Boolean(accessToken),
    hasHydrated: true,
  });
}

describe("useCurrentUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetAuthStore(null);
  });

  it("exposes a stable, exported query key", () => {
    expect(CURRENT_USER_QUERY_KEY).toEqual(["auth", "me"]);
  });

  it("is disabled and never calls fetchMe when no access token", async () => {
    const spy = vi.spyOn(authApi, "fetchMe");
    resetAuthStore(null);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isReady).toBe(false);
    // Give React Query a tick — still no call expected.
    await new Promise((r) => setTimeout(r, 20));
    expect(spy).not.toHaveBeenCalled();
  });

  it("fetches /me and exposes profile when access token present", async () => {
    const profile: authApi.UserInfo = {
      id: "u-42",
      email: "caller@test.local",
      display_name: "Caller",
      role: "admin",
      status: "active",
    };
    const spy = vi.spyOn(authApi, "fetchMe").mockResolvedValue(profile);
    resetAuthStore("access-token-123");

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.user).toEqual(profile);
    expect(result.current.error).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("access-token-123");
  });

  it("surfaces fetchMe errors without retrying on 401", async () => {
    const spy = vi
      .spyOn(authApi, "fetchMe")
      .mockRejectedValue(new Error("HTTP 401 unauthorized"));
    resetAuthStore("stale-token");

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.user).toBeNull();
    expect(result.current.isReady).toBe(false);
    // 401 MUST NOT be retried by this hook — auth store owns refresh.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
