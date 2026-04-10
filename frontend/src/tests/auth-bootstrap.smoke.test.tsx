/**
 * Auth bootstrap smoke tests — F5 / refresh logout fix.
 *
 * These tests exercise the route-guard side of the fix: after the Zustand
 * store hydrates synchronously from localStorage, `AuthGuard` and
 * `AppEntryGate` must make the correct redirect decisions on the very
 * first render, with no effect-based hydration race.
 *
 * Why not reuse the real router? The real router (`app/router.tsx`) pulls
 * in ~80 lazy admin/user pages which drag the entire app into jsdom. That
 * is far too heavy for a focused auth unit. We therefore build a minimal
 * `createMemoryRouter` tree that mounts only the guard + entry gate and
 * asserts on the rendered sentinel + the resolved URL.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the onboarding hook BEFORE importing the components that consume it.
// The AppEntryGate authenticated branch uses useOnboardingStatus; we mock
// it to return a deterministic "no onboarding required" shape so the tests
// never hit the network. Individual tests can override with
// `vi.mocked(useOnboardingStatus).mockReturnValueOnce(...)`.
vi.mock("../hooks/useOnboardingStatus", () => ({
  useOnboardingStatus: vi.fn(() => ({
    data: { onboarding_required: false },
    isLoading: false,
    isError: false,
  })),
}));

import { AuthGuard } from "../app/guards/AuthGuard";
import { AppEntryGate } from "../app/AppEntryGate";
import { useAuthStore } from "../stores/authStore";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACCESS = "contenthub:access-token";
const REFRESH = "contenthub:refresh-token";
const USER = "contenthub:auth-user";
const ACTIVE_USER = "contenthub:active-user-id";

function seedAdmin(): void {
  localStorage.setItem(ACCESS, "acc-token-xyz");
  localStorage.setItem(REFRESH, "ref-token-xyz");
  localStorage.setItem(
    USER,
    JSON.stringify({
      id: "user-admin-1",
      email: "admin@contenthub.local",
      display_name: "Admin",
      role: "admin",
    }),
  );
  localStorage.setItem(ACTIVE_USER, "user-admin-1");
}

function seedUser(): void {
  localStorage.setItem(ACCESS, "acc-token-xyz");
  localStorage.setItem(REFRESH, "ref-token-xyz");
  localStorage.setItem(
    USER,
    JSON.stringify({
      id: "user-user-1",
      email: "user@contenthub.local",
      display_name: "User",
      role: "user",
    }),
  );
  localStorage.setItem(ACTIVE_USER, "user-user-1");
}

/**
 * Force the currently-loaded Zustand store to re-read from localStorage.
 * This is needed because the store was created once at module-load time
 * (before `beforeEach` seeded localStorage), and we need every test to see
 * a fresh hydrated snapshot.
 */
function rehydrateStore(): void {
  useAuthStore.getState().loadFromStorage();
}

/**
 * Build a minimal memory router tree that includes just:
 *   - "/"       → AppEntryGate
 *   - "/admin"  → AuthGuard (requiredRole=admin) → sentinel
 *   - "/user"   → AuthGuard → sentinel
 *   - "/login"  → sentinel
 *   - "/onboarding" → sentinel
 *
 * We use the `<MemoryRouter>` + `<Routes>` API (not `createMemoryRouter`)
 * to keep navigations synchronous-ish under jsdom — the data router path
 * has a known `AbortSignal` interop quirk with undici inside vitest that
 * shows up on the very first `<Navigate>` redirect, and we don't need the
 * data-router features here.
 */
function renderAt(path: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<AppEntryGate />} />
          <Route
            path="/login"
            element={<div data-testid="sentinel-login">LOGIN</div>}
          />
          <Route
            path="/onboarding"
            element={<div data-testid="sentinel-onboarding">ONBOARDING</div>}
          />
          <Route path="/admin" element={<AuthGuard requiredRole="admin" />}>
            <Route
              index
              element={<div data-testid="sentinel-admin">ADMIN</div>}
            />
          </Route>
          <Route path="/user" element={<AuthGuard />}>
            <Route
              index
              element={<div data-testid="sentinel-user">USER</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("auth bootstrap — AuthGuard + AppEntryGate", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useOnboardingStatus).mockClear();
    vi.mocked(useOnboardingStatus).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { onboarding_required: false } as any,
      isLoading: false,
      isError: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("refreshes /admin with a persisted admin session without bouncing to /login", async () => {
    seedAdmin();
    rehydrateStore();

    renderAt("/admin");

    // Admin sentinel renders synchronously — no bounce.
    expect(await screen.findByTestId("sentinel-admin")).toBeTruthy();
    expect(screen.queryByTestId("sentinel-login")).toBeNull();
  });

  it("refreshes /user with a persisted user session without bouncing to /login", async () => {
    seedUser();
    rehydrateStore();

    renderAt("/user");

    expect(await screen.findByTestId("sentinel-user")).toBeTruthy();
    expect(screen.queryByTestId("sentinel-login")).toBeNull();
  });

  it("redirects unauthenticated /admin visit to /login (no token)", async () => {
    // localStorage empty (cleared in beforeEach)
    rehydrateStore();

    renderAt("/admin");

    expect(await screen.findByTestId("sentinel-login")).toBeTruthy();
    expect(screen.queryByTestId("sentinel-admin")).toBeNull();
  });

  it("redirects unauthenticated /user visit to /login (no token)", async () => {
    rehydrateStore();
    renderAt("/user");
    expect(await screen.findByTestId("sentinel-login")).toBeTruthy();
  });

  it("treats a corrupted user row as unauthenticated and routes to /login", async () => {
    localStorage.setItem(ACCESS, "acc-token-xyz");
    localStorage.setItem(REFRESH, "ref-token-xyz");
    localStorage.setItem(USER, "{not valid json");
    rehydrateStore();

    renderAt("/admin");

    expect(await screen.findByTestId("sentinel-login")).toBeTruthy();
  });

  it("non-admin visiting /admin gets bounced to /user (role mismatch)", async () => {
    seedUser(); // role = "user"
    rehydrateStore();

    renderAt("/admin");

    // AuthGuard redirects /admin → /user for non-admins. The /user route
    // then mounts its own AuthGuard (no requiredRole) and renders.
    expect(await screen.findByTestId("sentinel-user")).toBeTruthy();
    expect(screen.queryByTestId("sentinel-admin")).toBeNull();
  });

  it("AppEntryGate sends authenticated visitors to /user when no onboarding required", async () => {
    seedUser();
    rehydrateStore();

    renderAt("/");

    expect(await screen.findByTestId("sentinel-user")).toBeTruthy();
    // And crucially: we never flashed /login while waiting for onboarding.
    expect(screen.queryByTestId("sentinel-login")).toBeNull();
  });

  it("AppEntryGate redirects unauthenticated root visits straight to /login without consulting onboarding", async () => {
    rehydrateStore(); // empty localStorage
    vi.mocked(useOnboardingStatus).mockClear();

    renderAt("/");

    expect(await screen.findByTestId("sentinel-login")).toBeTruthy();
    // The authenticated branch — and therefore useOnboardingStatus — must
    // NEVER mount for an anonymous visitor. This is the structural
    // guarantee that prevents the old "auth effect loses race to
    // onboarding query" bounce.
    expect(vi.mocked(useOnboardingStatus)).not.toHaveBeenCalled();
  });
});
