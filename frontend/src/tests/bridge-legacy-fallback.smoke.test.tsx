/**
 * Bridge legacy fallback smoke test — Faz 2.
 *
 * Verifies the trampoline pattern: each legacy page calls
 * `useSurfacePageOverride(key)` at render time, and if the override hook
 * returns null the legacy body is rendered unchanged.
 *
 * We mock ALL dependencies of the legacy pages so we can mount them in a
 * MemoryRouter without a live backend. The test is scoped to prove the
 * trampoline returns the legacy implementation when there is no surface
 * context in the tree (Faz 1 default) — which is the same code path the
 * kill-switch-off and non-bridge-surface scenarios hit.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Heavy-mocks — the legacy pages import many components. We stub them all so
// the test stays fast and deterministic. Every mock returns a testId we can
// assert on.
// ---------------------------------------------------------------------------

vi.mock("../hooks/useJobsList", () => ({
  useJobsList: () => ({ data: [], isLoading: false, isError: false, error: null }),
}));

vi.mock("../hooks/useJobDetail", () => ({
  useJobDetail: () => ({ data: null, isLoading: true, isError: false, error: null }),
}));

vi.mock("../hooks/useSSE", () => ({
  useSSE: () => ({ connected: true, reconnecting: false }),
}));

vi.mock("../hooks/usePublish", () => ({
  usePublishRecords: () => ({ data: [], isLoading: false, isError: false }),
  usePublishRecordForJob: () => ({ data: [] }),
  useCreatePublishRecordFromJob: () => ({ mutateAsync: async () => ({}), isPending: false }),
  // Gate 4 (Z-1) bulk hooks
  useBulkApprovePublishRecords: () => ({ mutateAsync: async () => ({ succeeded: 0, failed: 0, results: [] }), isPending: false }),
  useBulkRejectPublishRecords: () => ({ mutateAsync: async () => ({ succeeded: 0, failed: 0, results: [] }), isPending: false }),
  useBulkCancelPublishRecords: () => ({ mutateAsync: async () => ({ succeeded: 0, failed: 0, results: [] }), isPending: false }),
  useBulkRetryPublishRecords: () => ({ mutateAsync: async () => ({ succeeded: 0, failed: 0, results: [] }), isPending: false }),
  // Gate 4 (Z-3) scheduler health
  useSchedulerHealth: () => ({ data: null, isLoading: false, isError: false }),
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("../hooks/useScopedKeyboardNavigation", () => ({
  useScopedKeyboardNavigation: () => ({ activeIndex: 0, handleKeyDown: () => {} }),
}));

vi.mock("../api/jobsApi", () => ({
  markJobsAsTestData: vi.fn(async () => ({})),
  cloneJob: vi.fn(async () => ({ id: "new" })),
}));

vi.mock("../components/jobs/JobsTable", () => ({
  JobsTable: () => <div data-testid="jobs-table-stub" />,
}));

vi.mock("../components/jobs/JobDetailPanel", () => ({
  JobDetailPanel: () => <div data-testid="job-detail-panel-stub" />,
}));

vi.mock("../components/jobs/JobOverviewPanel", () => ({
  JobOverviewPanel: () => <div data-testid="job-overview-panel-stub" />,
}));

vi.mock("../components/jobs/JobTimelinePanel", () => ({
  JobTimelinePanel: () => <div data-testid="job-timeline-panel-stub" />,
}));

vi.mock("../components/jobs/JobSystemPanels", () => ({
  JobSystemPanels: () => <div data-testid="job-system-panels-stub" />,
}));

vi.mock("../components/jobs/JobActionsPanel", () => ({
  JobActionsPanel: () => <div data-testid="job-actions-panel-stub" />,
}));

vi.mock("../components/shared/VideoPlayer", () => ({
  VideoPlayer: () => <div data-testid="video-player-stub" />,
}));

vi.mock("../components/quicklook/JobQuickLookContent", () => ({
  JobQuickLookContent: () => <div data-testid="quicklook-content-stub" />,
}));

vi.mock("../components/design-system/Sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet-stub">{children}</div> : null,
}));

vi.mock("../components/design-system/QuickLook", () => ({
  QuickLook: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="quicklook-stub">{children}</div> : null,
  useQuickLookTrigger: () => {},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage(page: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Legacy page trampolines — null override → legacy body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("JobsRegistryPage renders the legacy body without a SurfaceProvider", async () => {
    const { JobsRegistryPage } = await import("../pages/admin/JobsRegistryPage");
    renderPage(<JobsRegistryPage />);
    // Legacy body always renders the workflow note testid — bridge override
    // does NOT use that testid, so its presence proves we hit the legacy path.
    expect(screen.getByTestId("jobs-registry-workflow-note")).toBeDefined();
  });

  it("JobDetailPage renders the legacy loading body without a SurfaceProvider", async () => {
    const { JobDetailPage } = await import("../pages/admin/JobDetailPage");
    renderPage(<JobDetailPage />);
    // Legacy loading branch has a specific testid prefix
    expect(screen.getByTestId("job-detail-loading")).toBeDefined();
  });

  it("PublishCenterPage renders the legacy body without a SurfaceProvider", async () => {
    const { PublishCenterPage } = await import("../pages/admin/PublishCenterPage");
    renderPage(<PublishCenterPage />);
    expect(screen.getByTestId("publish-workflow-note")).toBeDefined();
  });
});
