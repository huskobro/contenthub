/**
 * authStore hydration unit tests — auth bootstrap refresh fix.
 *
 * These tests exercise the synchronous-hydration contract: the Zustand
 * lazy initializer in `stores/authStore.ts` must read tokens/user from
 * localStorage BEFORE the store is first consumed by React. That's the
 * mechanism that prevents the F5 logout race, so it is covered here
 * directly, without needing a DOM.
 *
 * Because the store is created at module load time, each test uses
 * `vi.resetModules()` + dynamic `import()` so it sees a fresh store
 * against a freshly-seeded (or freshly-cleared) localStorage.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const ACCESS = "contenthub:access-token";
const REFRESH = "contenthub:refresh-token";
const USER = "contenthub:auth-user";
const ACTIVE_USER = "contenthub:active-user-id";

function seedAuthenticated(): void {
  localStorage.setItem(ACCESS, "acc-token-xyz");
  localStorage.setItem(REFRESH, "ref-token-xyz");
  localStorage.setItem(
    USER,
    JSON.stringify({
      id: "user-1",
      email: "admin@contenthub.local",
      display_name: "Admin",
      role: "admin",
    }),
  );
  localStorage.setItem(ACTIVE_USER, "user-1");
}

async function loadFreshStore(): Promise<
  typeof import("../../stores/authStore")
> {
  vi.resetModules();
  return await import("../../stores/authStore");
}

describe("authStore — synchronous hydration (F5 refresh fix)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hydrates authenticated state from localStorage on store create", async () => {
    seedAuthenticated();
    const { useAuthStore } = await loadFreshStore();

    const state = useAuthStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe("acc-token-xyz");
    expect(state.refreshToken).toBe("ref-token-xyz");
    expect(state.user?.id).toBe("user-1");
    expect(state.user?.role).toBe("admin");
  });

  it("starts unauthenticated when localStorage is empty but still marks hasHydrated=true", async () => {
    // localStorage already cleared by beforeEach
    const { useAuthStore } = await loadFreshStore();

    const state = useAuthStore.getState();
    expect(state.hasHydrated).toBe(true); // bootstrap completed
    expect(state.isAuthenticated).toBe(false); // but no session
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it("treats partial storage (token but no user) as unauthenticated", async () => {
    localStorage.setItem(ACCESS, "acc-token-xyz");
    localStorage.setItem(REFRESH, "ref-token-xyz");
    // NOTE: no USER row — snapshot must reject the partial state.
    const { useAuthStore } = await loadFreshStore();

    const state = useAuthStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("treats corrupt user JSON as unauthenticated without throwing", async () => {
    localStorage.setItem(ACCESS, "acc-token-xyz");
    localStorage.setItem(REFRESH, "ref-token-xyz");
    localStorage.setItem(USER, "{this is not json");
    const { useAuthStore } = await loadFreshStore();

    const state = useAuthStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.isAuthenticated).toBe(false);
  });

  it("logout clears session state but leaves hasHydrated=true", async () => {
    seedAuthenticated();
    const { useAuthStore } = await loadFreshStore();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const after = useAuthStore.getState();
    expect(after.isAuthenticated).toBe(false);
    expect(after.accessToken).toBeNull();
    expect(after.user).toBeNull();
    // Critical: once bootstrapped, logout does NOT revert hasHydrated.
    expect(after.hasHydrated).toBe(true);
  });

  it("loadFromStorage (legacy action) re-reads the current localStorage state idempotently", async () => {
    const { useAuthStore } = await loadFreshStore();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    // Simulate another tab writing tokens — call the legacy re-read action.
    seedAuthenticated();
    useAuthStore.getState().loadFromStorage();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe("user-1");
    expect(state.hasHydrated).toBe(true);
  });
});
