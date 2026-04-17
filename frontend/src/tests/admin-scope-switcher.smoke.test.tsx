/**
 * AdminScopeSwitcher smoke tests — Redesign REV-2 / P1.1.
 *
 * Coverage matrix:
 *  1. Non-admin role → renders null (no leakage of scope UI to users).
 *  2. Admin mode="all" → button reads "Tüm Kullanıcılar", mode attr="all".
 *  3. Dropdown opens on click, shows "Tüm Kullanıcılar" option + user list.
 *  4. Clicking a user transitions store.mode="user" and store.userId.
 *  5. Clicking "Tüm Kullanıcılar" after focus returns store to mode="all".
 *  6. Escape key closes the dropdown.
 *  7. Outside click closes the dropdown.
 *  8. When mode="user", button label reflects the focused user.
 *
 * CLAUDE.md alignment:
 * - Visible scope: test asserts the label/aria reveal the current scope.
 * - No hidden behavior: explicit testids on every actionable element.
 * - Backend authority: this test only covers the client surface; backend
 *   ownership remains enforced elsewhere.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { AdminScopeSwitcher } from "../components/layout/AdminScopeSwitcher";
import {
  useAdminScopeStore,
  __resetAdminScopeStoreForTests,
} from "../stores/adminScopeStore";
import { useAuthStore } from "../stores/authStore";
import * as authApi from "../api/authApi";
import * as usersApi from "../api/usersApi";
import type { UserResponse } from "../api/usersApi";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_PROFILE: authApi.UserInfo = {
  id: "a-1",
  email: "admin@test.local",
  display_name: "Admin",
  role: "admin",
  status: "active",
};

const USER_PROFILE: authApi.UserInfo = {
  id: "u-7",
  email: "user@test.local",
  display_name: "User Seven",
  role: "user",
  status: "active",
};

const MOCK_USERS: UserResponse[] = [
  {
    id: "u-alpha",
    email: "alpha@test.local",
    display_name: "Alpha",
    slug: "alpha",
    role: "user",
    status: "active",
    override_count: 0,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "u-bravo",
    email: "bravo@test.local",
    display_name: "Bravo",
    slug: "bravo",
    role: "user",
    status: "active",
    override_count: 0,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function primeAuth(profile: authApi.UserInfo | null) {
  if (!profile) {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: true,
    });
    return;
  }
  useAuthStore.setState({
    accessToken: "t-test",
    refreshToken: "r-test",
    user: {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      role: profile.role,
    },
    isAuthenticated: true,
    hasHydrated: true,
  });
  vi.spyOn(authApi, "fetchMe").mockResolvedValue(profile);
}

function renderSwitcher() {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <AdminScopeSwitcher />
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminScopeSwitcher (P1.1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetAdminScopeStoreForTests();
    vi.spyOn(usersApi, "fetchUsers").mockResolvedValue(MOCK_USERS);
  });

  afterEach(() => {
    primeAuth(null);
    __resetAdminScopeStoreForTests();
  });

  it("renders nothing for a non-admin (user role)", async () => {
    primeAuth(USER_PROFILE);

    const { container } = renderSwitcher();

    // Wait a tick for the hooks to settle.
    await waitFor(() => {
      // Non-admin → the component returns null entirely.
      expect(container.querySelector("[data-testid='admin-scope-switcher']"))
        .toBeNull();
    });
  });

  it("renders 'Tüm Kullanıcılar' label in mode=all for admin", async () => {
    primeAuth(ADMIN_PROFILE);

    renderSwitcher();

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher")).toBeDefined();
    });

    const root = screen.getByTestId("admin-scope-switcher");
    expect(root.getAttribute("data-mode")).toBe("all");

    const label = screen.getByTestId("admin-scope-switcher-label");
    expect(label.textContent).toBe("Tüm Kullanıcılar");
  });

  it("opens dropdown on button click and lists users", async () => {
    primeAuth(ADMIN_PROFILE);

    renderSwitcher();

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-button")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("admin-scope-switcher-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-dropdown")).toBeDefined();
    });

    expect(screen.getByTestId("admin-scope-switcher-all")).toBeDefined();

    // Wait for the lazy users query to resolve.
    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-user-u-alpha")).toBeDefined();
      expect(screen.getByTestId("admin-scope-switcher-user-u-bravo")).toBeDefined();
    });
  });

  it("focuses a user when their row is clicked", async () => {
    primeAuth(ADMIN_PROFILE);

    renderSwitcher();

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-button")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("admin-scope-switcher-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-user-u-alpha")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("admin-scope-switcher-user-u-alpha"));

    await waitFor(() => {
      const state = useAdminScopeStore.getState();
      expect(state.mode).toBe("user");
      expect(state.userId).toBe("u-alpha");
    });

    // Dropdown should close after selection.
    expect(screen.queryByTestId("admin-scope-switcher-dropdown")).toBeNull();
  });

  it("returns to mode=all when 'Tüm Kullanıcılar' is clicked while focused", async () => {
    primeAuth(ADMIN_PROFILE);
    // Start already focused on a user.
    act(() => {
      useAdminScopeStore.getState().focusUser("u-bravo");
    });

    renderSwitcher();

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-button")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("admin-scope-switcher-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-all")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("admin-scope-switcher-all"));

    await waitFor(() => {
      const state = useAdminScopeStore.getState();
      expect(state.mode).toBe("all");
      expect(state.userId).toBeNull();
    });
  });

  it("closes the dropdown on Escape key", async () => {
    primeAuth(ADMIN_PROFILE);

    renderSwitcher();

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-button")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("admin-scope-switcher-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-dropdown")).toBeDefined();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("admin-scope-switcher-dropdown")).toBeNull();
    });
  });

  it("closes the dropdown on outside click", async () => {
    primeAuth(ADMIN_PROFILE);

    const { container } = renderSwitcher();

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-button")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("admin-scope-switcher-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-dropdown")).toBeDefined();
    });

    // Dispatch mousedown on document.body (outside the switcher root).
    fireEvent.mouseDown(container.ownerDocument.body);

    await waitFor(() => {
      expect(screen.queryByTestId("admin-scope-switcher-dropdown")).toBeNull();
    });
  });

  it("shows the focused user's name on the button when mode=user", async () => {
    primeAuth(ADMIN_PROFILE);

    renderSwitcher();

    // Open once to prime the users list (so focusedUser name is resolvable).
    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-button")).toBeDefined();
    });
    fireEvent.click(screen.getByTestId("admin-scope-switcher-button"));
    await waitFor(() => {
      expect(screen.getByTestId("admin-scope-switcher-user-u-bravo")).toBeDefined();
    });
    fireEvent.click(screen.getByTestId("admin-scope-switcher-user-u-bravo"));

    await waitFor(() => {
      const label = screen.getByTestId("admin-scope-switcher-label");
      expect(label.textContent).toBe("Bravo");
    });

    const root = screen.getByTestId("admin-scope-switcher");
    expect(root.getAttribute("data-mode")).toBe("user");
  });
});
