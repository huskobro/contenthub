/**
 * Canvas flow completion shell smoke test — Faz 3A.
 *
 * Mounts each of the four Canvas flow-completion override pages in isolation
 * and verifies the workspace hero + key data hooks render the expected
 * skeleton. Data hooks are mocked so the tests stay deterministic and do not
 * require a backend.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Heavy mocks — same strategy as canvas-user-shell.smoke.test.tsx
// ---------------------------------------------------------------------------

vi.mock("../stores/authStore", () => ({
  useAuthStore: (selector: (s: { user: { id: string; display_name: string } }) => unknown) =>
    selector({ user: { id: "u-1", display_name: "Test User" } }),
}));

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

vi.mock("../hooks/useChannelProfiles", () => ({
  useChannelProfiles: () => ({ data: [], isLoading: false }),
  useChannelProfile: () => ({ data: null, isLoading: false }),
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
vi.mock("../hooks/useContentProjects", () => ({
  useContentProjects: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock("../hooks/useConnections", () => ({
  useMyConnections: () => ({
    data: { items: [], total: 0, kpis: null },
    isLoading: false,
    isError: false,
  }),
}));

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

describe("Canvas Faz 3A shell smoke — workspace chrome + workspace data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CanvasUserPublishPage mounts the publish atelier hero + project list", async () => {
    const { CanvasUserPublishPage } = await import(
      "../surfaces/canvas/CanvasUserPublishPage"
    );
    renderPage(<CanvasUserPublishPage />);
    expect(screen.getByTestId("canvas-user-publish")).toBeDefined();
    expect(screen.getByTestId("canvas-publish-hero")).toBeDefined();
    expect(screen.getByTestId("canvas-publish-project-list")).toBeDefined();
    // Placeholder panel is shown when no project is selected.
    expect(screen.getByTestId("canvas-publish-placeholder")).toBeDefined();
  });

  it("CanvasMyChannelsPage mounts the channel studio with stats ribbon", async () => {
    const { CanvasMyChannelsPage } = await import(
      "../surfaces/canvas/CanvasMyChannelsPage"
    );
    renderPage(<CanvasMyChannelsPage />);
    expect(screen.getByTestId("canvas-my-channels")).toBeDefined();
    expect(screen.getByTestId("canvas-channels-hero")).toBeDefined();
    expect(screen.getByTestId("canvas-channels-stats")).toBeDefined();
    // Empty grid -> empty state renders.
    expect(screen.getByTestId("canvas-channels-empty")).toBeDefined();
  });

  it("CanvasUserConnectionsPage mounts the connection board with health ribbon", async () => {
    const { CanvasUserConnectionsPage } = await import(
      "../surfaces/canvas/CanvasUserConnectionsPage"
    );
    renderPage(<CanvasUserConnectionsPage />);
    expect(screen.getByTestId("canvas-user-connections")).toBeDefined();
    expect(screen.getByTestId("canvas-connections-hero")).toBeDefined();
    expect(screen.getByTestId("canvas-connections-health-ribbon")).toBeDefined();
    expect(screen.getByTestId("canvas-connections-filters")).toBeDefined();
    // Empty items -> empty state renders.
    expect(screen.getByTestId("canvas-connections-empty")).toBeDefined();
  });

  it("CanvasUserAnalyticsPage mounts the performance studio with KPIs + charts", async () => {
    const { CanvasUserAnalyticsPage } = await import(
      "../surfaces/canvas/CanvasUserAnalyticsPage"
    );
    renderPage(<CanvasUserAnalyticsPage />);
    expect(screen.getByTestId("canvas-user-analytics")).toBeDefined();
    expect(screen.getByTestId("canvas-analytics-hero")).toBeDefined();
    expect(screen.getByTestId("canvas-analytics-kpis")).toBeDefined();
    expect(screen.getByTestId("canvas-analytics-trend-card")).toBeDefined();
    expect(screen.getByTestId("canvas-analytics-distribution-card")).toBeDefined();
  });
});
