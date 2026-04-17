/**
 * UserIdentityStrip smoke tests — Redesign REV-2 / P1.2.
 *
 * Coverage:
 *  1. Admin role → renders null (strip is user-panel only).
 *  2. Unauthenticated → renders null (no identity to show).
 *  3. User role → renders name + scope chip + avatar.
 *  4. unreadCount > 0 → notification chip visible with count.
 *  5. unreadCount === 0 → notification chip absent.
 *  6. Today events > 0 → today chip visible with count.
 *  7. Today events === 0 → today chip absent.
 *
 * CLAUDE.md uyumu:
 *  - No hidden behavior: tüm sayaçlar data-testid üzerinden görünür.
 *  - Server-state React Query, client-state Zustand — ayrım korunur.
 *  - Backend authority değişmedi; strip yalnız görsel katman.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { UserIdentityStrip } from "../components/layout/UserIdentityStrip";
import { useAuthStore } from "../stores/authStore";
import * as authApi from "../api/authApi";
import * as notifApi from "../api/notificationApi";
import * as calendarApi from "../api/calendarApi";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_PROFILE: authApi.UserInfo = {
  id: "u-7",
  email: "user7@test.local",
  display_name: "Hüseyin",
  role: "user",
  status: "active",
};

const ADMIN_PROFILE: authApi.UserInfo = {
  id: "a-1",
  email: "admin@test.local",
  display_name: "Admin",
  role: "admin",
  status: "active",
};

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

function primeNotif(opts: { unread: number; total: number }) {
  // useNotifications pulls list + count. Stub both.
  vi.spyOn(notifApi, "fetchMyNotifications").mockResolvedValue([]);
  vi.spyOn(notifApi, "fetchNotifications").mockResolvedValue([]);
  vi.spyOn(notifApi, "fetchNotificationCount").mockResolvedValue({
    total: opts.total,
    unread: opts.unread,
  });
}

function primeCalendar(eventsToday: number) {
  vi.spyOn(calendarApi, "fetchCalendarEvents").mockResolvedValue(
    Array.from({ length: eventsToday }).map((_, i) => ({
      id: `evt-${i}`,
      event_type: "content_project" as const,
      title: `Evt ${i}`,
      channel_profile_id: null,
      owner_user_id: "u-7",
      related_project_id: null,
      related_publish_record_id: null,
      related_post_id: null,
      start_at: new Date().toISOString(),
      end_at: null,
      status: "scheduled",
      platform: null,
      module_type: null,
      action_url: null,
      meta_summary: null,
      is_overdue: false,
      primary_platform: null,
      inbox_item_id: null,
      inbox_item_status: null,
    })),
  );
}

function renderStrip() {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <UserIdentityStrip />
    </Wrapper>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UserIdentityStrip (P1.2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    primeNotif({ unread: 0, total: 0 });
    primeCalendar(0);
  });

  afterEach(() => {
    primeAuth(null);
  });

  it("renders nothing for admin role (user-panel strip only)", async () => {
    primeAuth(ADMIN_PROFILE);

    const { container } = renderStrip();

    // useCurrentUser resolves synchronously via mocked fetchMe; give it a tick.
    await waitFor(() => {
      expect(container.querySelector("[data-testid='user-identity-strip']"))
        .toBeNull();
    });
  });

  it("renders nothing when unauthenticated", () => {
    primeAuth(null);

    const { container } = renderStrip();

    expect(container.querySelector("[data-testid='user-identity-strip']"))
      .toBeNull();
  });

  it("shows name, scope chip, and avatar for user role", async () => {
    primeAuth(USER_PROFILE);

    renderStrip();

    await waitFor(() => {
      expect(screen.getByTestId("user-identity-strip")).toBeDefined();
    });

    expect(screen.getByTestId("user-identity-strip-name").textContent)
      .toBe("Hüseyin");
    expect(screen.getByTestId("user-identity-strip-scope").textContent)
      .toBe("Kendi alanım");
    expect(screen.getByTestId("user-identity-strip-avatar").textContent)
      .toBe("H");
  });

  it("shows notification chip when unreadCount > 0", async () => {
    primeAuth(USER_PROFILE);
    primeNotif({ unread: 3, total: 10 });

    renderStrip();

    await waitFor(() => {
      expect(screen.getByTestId("user-identity-strip")).toBeDefined();
    });

    await waitFor(() => {
      const chip = screen.getByTestId("user-identity-strip-notif");
      expect(chip).toBeDefined();
      expect(chip.textContent).toContain("3");
      expect(chip.textContent).toContain("yeni");
    });
  });

  it("hides notification chip when unreadCount === 0", async () => {
    primeAuth(USER_PROFILE);
    primeNotif({ unread: 0, total: 2 });

    renderStrip();

    await waitFor(() => {
      expect(screen.getByTestId("user-identity-strip")).toBeDefined();
    });

    // Give a tick for counts query to settle.
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("user-identity-strip-notif")).toBeNull();
  });

  it("shows today chip when today events > 0", async () => {
    primeAuth(USER_PROFILE);
    primeCalendar(2);

    renderStrip();

    await waitFor(() => {
      expect(screen.getByTestId("user-identity-strip")).toBeDefined();
    });

    await waitFor(() => {
      const chip = screen.getByTestId("user-identity-strip-today");
      expect(chip).toBeDefined();
      expect(chip.textContent).toContain("2");
      expect(chip.textContent).toContain("bugün");
    });
  });

  it("hides today chip when no events", async () => {
    primeAuth(USER_PROFILE);
    primeCalendar(0);

    renderStrip();

    await waitFor(() => {
      expect(screen.getByTestId("user-identity-strip")).toBeDefined();
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("user-identity-strip-today")).toBeNull();
  });
});
