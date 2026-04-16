/**
 * Canvas workspace completion shell smoke test — Faz 3B.
 *
 * Mounts each of the two new Canvas workspace-completion override pages in
 * isolation and verifies the workspace chrome + key data hooks render the
 * expected skeleton. Data hooks are mocked so the tests stay deterministic
 * and do not require a backend.
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

vi.mock("../api/calendarApi", () => ({
  fetchCalendarEvents: vi.fn(async () => []),
  fetchChannelCalendarContext: vi.fn(async () => null),
}));
vi.mock("../api/channelProfilesApi", () => ({
  fetchChannelProfiles: vi.fn(async () => []),
}));

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

function renderPlain(page: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderAt(path: string, element: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/user/channels/:channelId" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Canvas Faz 3B shell smoke — workspace planning + channel studio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CanvasUserCalendarPage mounts the calendar hero + stats + board", async () => {
    const { CanvasUserCalendarPage } = await import(
      "../surfaces/canvas/CanvasUserCalendarPage"
    );
    renderPlain(<CanvasUserCalendarPage />);
    expect(screen.getByTestId("canvas-user-calendar")).toBeDefined();
    expect(screen.getByTestId("canvas-calendar-hero")).toBeDefined();
    expect(screen.getByTestId("canvas-calendar-stats")).toBeDefined();
    expect(screen.getByTestId("canvas-calendar-controls")).toBeDefined();
    expect(screen.getByTestId("canvas-calendar-board")).toBeDefined();
  });

  it("CanvasChannelDetailPage mounts the studio hero + health + cards", async () => {
    const { CanvasChannelDetailPage } = await import(
      "../surfaces/canvas/CanvasChannelDetailPage"
    );
    renderAt("/user/channels/ch-1", <CanvasChannelDetailPage />);
    expect(screen.getByTestId("canvas-channel-detail")).toBeDefined();
    expect(screen.getByTestId("canvas-channel-detail-hero")).toBeDefined();
    expect(screen.getByTestId("canvas-channel-detail-health")).toBeDefined();
    expect(screen.getByTestId("canvas-channel-identity")).toBeDefined();
    expect(screen.getByTestId("canvas-channel-credentials")).toBeDefined();
    expect(screen.getByTestId("canvas-channel-oauth")).toBeDefined();
    expect(screen.getByTestId("canvas-channel-projects")).toBeDefined();
    // Related projects is empty for mocked response → empty state shown.
    expect(screen.getByTestId("canvas-channel-projects-empty")).toBeDefined();
  });
});
