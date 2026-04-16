/**
 * Canvas workspace completion legacy fallback smoke test — Faz 3B.
 *
 * Mirrors `canvas-flow-legacy-fallback.smoke.test.tsx` but covers the two new
 * trampoline pages Faz 3B introduced:
 *   - UserCalendarPage      (`user.calendar`)
 *   - ChannelDetailPage     (`user.channels.detail`)
 *
 * Contract: with NO SurfaceProvider mounted, `useSurfacePageOverride` returns
 * null → the legacy body must render. Heavy dependencies are stubbed so the
 * test can mount without a backend.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Heavy mocks
// ---------------------------------------------------------------------------

vi.mock("../stores/authStore", () => ({
  useAuthStore: (
    selector: (s: { user: { id: string; display_name: string } }) => unknown,
  ) => selector({ user: { id: "u-1", display_name: "Test User" } }),
}));

// Calendar API — returns empty lists so the legacy calendar renders without
// bombing on missing data.
vi.mock("../api/calendarApi", () => ({
  fetchCalendarEvents: vi.fn(async () => []),
  fetchChannelCalendarContext: vi.fn(async () => null),
}));
vi.mock("../api/channelProfilesApi", () => ({
  fetchChannelProfiles: vi.fn(async () => []),
}));

// Channel profile + credentials hooks for the legacy ChannelDetailPage.
vi.mock("../hooks/useChannelProfiles", () => ({
  useChannelProfile: () => ({
    data: {
      id: "ch-1",
      profile_name: "Test Channel",
      channel_slug: "test-channel",
      default_language: "tr",
      profile_type: null,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
    },
    isLoading: false,
  }),
  useChannelProfiles: () => ({ data: [], isLoading: false }),
  useCreateChannelProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateChannelProfileFromURL: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteChannelProfile: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useReimportChannelProfile: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));
vi.mock("../hooks/useCredentials", () => ({
  useYouTubeStatusByChannel: () => ({ data: null, isLoading: false }),
  useYouTubeChannelInfoByChannel: () => ({ data: null, isLoading: false }),
  useChannelCredentials: () => ({ data: { has_credentials: false } }),
  useSaveChannelCredentials: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRevokeYouTube: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
  }),
}));
vi.mock("../hooks/useContentProjects", () => ({
  useContentProjects: () => ({ data: [], isLoading: false, isError: false }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderAt(path: string, element: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/user/channels/:channelId" element={element} />
          <Route path="/user/calendar" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Canvas Faz 3B trampolines — legacy bodies render without SurfaceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UserCalendarPage renders the legacy calendar when no override is resolved", async () => {
    const { UserCalendarPage } = await import("../pages/user/UserCalendarPage");
    renderAt("/user/calendar", <UserCalendarPage />);
    // Legacy body uses testId="calendar-page"; canvas override testId would be
    // "canvas-user-calendar".
    expect(screen.getByTestId("calendar-page")).toBeDefined();
    expect(screen.queryByTestId("canvas-user-calendar")).toBeNull();
  });

  it("ChannelDetailPage renders the legacy body when no override is resolved", async () => {
    const { ChannelDetailPage } = await import(
      "../pages/user/ChannelDetailPage"
    );
    renderAt("/user/channels/ch-1", <ChannelDetailPage />);
    // Legacy body uses PageShell and renders "Kanal Bilgileri" section title.
    // Canvas override testId would be "canvas-channel-detail".
    expect(screen.queryByTestId("canvas-channel-detail")).toBeNull();
    // The legacy body renders the channel profile name from the mocked hook.
    expect(screen.getByText("Test Channel")).toBeDefined();
  });
});
