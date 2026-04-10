/**
 * Canvas flow completion legacy fallback smoke test — Faz 3A.
 *
 * Mirrors `canvas-legacy-fallback.smoke.test.tsx` but covers the four new
 * trampoline pages Faz 3A introduced:
 *   - UserPublishPage (`user.publish`)
 *   - MyChannelsPage (`user.channels.list`)
 *   - UserConnectionsPage (`user.connections.list`)
 *   - UserAnalyticsPage (`user.analytics.overview`)
 *
 * Contract: with NO SurfaceProvider mounted, `useSurfacePageOverride` returns
 * null → the legacy body must render. Heavy dependencies are stubbed so the
 * test can mount without a backend.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Heavy mocks
// ---------------------------------------------------------------------------

vi.mock("../stores/authStore", () => ({
  useAuthStore: (selector: (s: { user: { id: string; display_name: string } }) => unknown) =>
    selector({ user: { id: "u-1", display_name: "Test User" } }),
}));

// Publish API
vi.mock("../api/contentProjectsApi", () => ({
  fetchContentProjects: vi.fn(async () => []),
}));
vi.mock("../api/channelProfilesApi", () => ({
  fetchChannelProfiles: vi.fn(async () => []),
}));
vi.mock("../api/platformConnectionsApi", () => ({
  fetchConnectionsForPublish: vi.fn(async () => []),
}));
vi.mock("../api/publishApi", () => ({
  createPublishRecordFromJob: vi.fn(),
  fetchPublishRecordsByProject: vi.fn(async () => []),
  submitForReview: vi.fn(),
  updatePublishIntent: vi.fn(),
}));

// Channels API / hooks
vi.mock("../hooks/useChannelProfiles", () => ({
  useChannelProfiles: () => ({ data: [], isLoading: false }),
  useCreateChannelProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../hooks/useContentProjects", () => ({
  useContentProjects: () => ({ data: [], isLoading: false, isError: false }),
}));

// Connections hook
vi.mock("../hooks/useConnections", () => ({
  useMyConnections: () => ({
    data: { items: [], total: 0, kpis: null },
    isLoading: false,
    isError: false,
  }),
}));

// Analytics API
vi.mock("../api/analyticsApi", async () => {
  const actual = await vi.importActual<typeof import("../api/analyticsApi")>(
    "../api/analyticsApi",
  );
  return {
    ...actual,
    fetchDashboardSummary: vi.fn(async () => ({
      window: "last_30d",
      total_projects: 0,
      total_jobs: 0,
      publish_success_rate: 0,
      avg_production_duration_seconds: 0,
      running_job_count: 0,
      failed_job_count: 0,
      queue_size: 0,
      recent_errors: [],
      daily_trend: [],
      module_distribution: [],
      platform_distribution: [],
      filters_applied: {},
    })),
  };
});

// Engagement composer (used by legacy publish form)
vi.mock("../components/engagement/AssistedComposer", () => ({
  AssistedComposer: ({ value }: { value: string }) => (
    <div data-testid="assisted-composer-stub">{value}</div>
  ),
}));

// Capability warning (used by legacy publish form)
vi.mock("../components/connections/ConnectionCapabilityWarning", () => ({
  ConnectionCapabilityWarning: () => <div data-testid="cap-warning-stub" />,
  useCapabilityStatus: () => ({ status: "unknown" }),
}));

// Shared charts (used by legacy analytics)
vi.mock("../components/shared/charts/TrendChart", () => ({
  TrendChart: () => <div data-testid="trend-chart-stub" />,
}));
vi.mock("../components/shared/charts/DistributionDonut", () => ({
  DistributionDonut: () => <div data-testid="distribution-donut-stub" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage(page: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Canvas Faz 3A trampolines — legacy bodies render without SurfaceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UserPublishPage renders the legacy body when no override is resolved", async () => {
    const { UserPublishPage } = await import("../pages/user/UserPublishPage");
    renderPage(<UserPublishPage />);
    // Legacy body uses PageShell testId="user-publish-page".
    expect(screen.getByTestId("user-publish-page-heading")).toBeDefined();
    expect(screen.queryByTestId("canvas-user-publish")).toBeNull();
  });

  it("MyChannelsPage renders the legacy body when no override is resolved", async () => {
    const { MyChannelsPage } = await import("../pages/user/MyChannelsPage");
    renderPage(<MyChannelsPage />);
    // Legacy body uses PageShell testId="my-channels".
    expect(screen.getByTestId("my-channels-heading")).toBeDefined();
    expect(screen.queryByTestId("canvas-my-channels")).toBeNull();
  });

  it("UserConnectionsPage renders the legacy body when no override is resolved", async () => {
    const { UserConnectionsPage } = await import(
      "../pages/user/UserConnectionsPage"
    );
    renderPage(<UserConnectionsPage />);
    // Legacy body uses PageShell testId="user-connections" (added in Faz 3A).
    expect(screen.getByTestId("user-connections-heading")).toBeDefined();
    expect(screen.queryByTestId("canvas-user-connections")).toBeNull();
  });

  it("UserAnalyticsPage renders the legacy body when no override is resolved", async () => {
    const { UserAnalyticsPage } = await import(
      "../pages/user/UserAnalyticsPage"
    );
    renderPage(<UserAnalyticsPage />);
    // Legacy body uses PageShell testId="user-analytics".
    expect(screen.getByTestId("user-analytics-heading")).toBeDefined();
    expect(screen.queryByTestId("canvas-user-analytics")).toBeNull();
  });
});
