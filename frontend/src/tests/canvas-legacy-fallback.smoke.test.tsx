/**
 * Canvas legacy fallback smoke test — Faz 3.
 *
 * Verifies the trampoline pattern for user pages:
 *   - UserDashboardPage, MyProjectsPage, and ProjectDetailPage each call
 *     `useSurfacePageOverride(key)` at render time.
 *   - When NO SurfaceProvider is mounted (the default in this test), the
 *     override hook returns null, so the legacy body must render.
 *
 * This is the Faz 3 equivalent of bridge-legacy-fallback.smoke.test.tsx.
 * Heavy dependencies of the legacy bodies are stubbed so the test can mount
 * without a live backend.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Heavy-mocks — legacy user pages pull many components + hooks. We stub them
// so the trampoline exercise stays pure.
// ---------------------------------------------------------------------------

vi.mock("../stores/authStore", () => ({
  useAuthStore: (selector: (s: { user: { id: string; display_name: string } }) => unknown) =>
    selector({ user: { id: "u-1", display_name: "Test User" } }),
}));

vi.mock("../hooks/useOnboardingStatus", () => ({
  useOnboardingStatus: () => ({
    data: { onboarding_required: false },
    isLoading: false,
  }),
}));

vi.mock("../hooks/useContentProjects", () => ({
  useContentProjects: () => ({ data: [], isLoading: false, isError: false }),
  useContentProject: () => ({
    data: {
      id: "p-1",
      user_id: "u-1",
      channel_profile_id: "c-1",
      module_type: "standard_video",
      title: "Legacy Project",
      description: null,
      current_stage: null,
      content_status: "draft",
      review_status: "not_required",
      publish_status: "unpublished",
      primary_platform: null,
      origin_type: "manual",
      priority: "normal",
      deadline_at: null,
      active_job_id: null,
      latest_output_ref: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCreateContentProject: () => ({ mutate: vi.fn(), isPending: false }),
  useProjectSummary: () => ({ data: null, isLoading: false, isError: false }),
  useProjectJobs: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock("../hooks/useChannelProfiles", () => ({
  useChannelProfiles: () => ({ data: [], isLoading: false }),
  useChannelProfile: () => ({ data: null, isLoading: false }),
}));

vi.mock("../api/jobsApi", () => ({
  fetchJobs: vi.fn(async () => []),
}));

vi.mock("../api/standardVideoApi", () => ({
  fetchStandardVideos: vi.fn(async () => []),
  startStandardVideoProduction: vi.fn(async () => ({ job_id: "j-1" })),
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("../components/dashboard/PostOnboardingHandoff", () => ({
  PostOnboardingHandoff: () => <div data-testid="post-onboarding-handoff-stub" />,
}));

vi.mock("../components/dashboard/UserJobTracker", () => ({
  UserJobTracker: () => <div data-testid="user-job-tracker-stub" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage(
  page: React.ReactElement,
  { initialRoute = "/" }: { initialRoute?: string } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/user/projects/:projectId" element={page} />
          <Route path="*" element={page} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Canvas trampoline — legacy user pages render without SurfaceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UserDashboardPage renders the legacy body when no override is resolved", async () => {
    const { UserDashboardPage } = await import("../pages/UserDashboardPage");
    renderPage(<UserDashboardPage />);
    // Legacy body uses PageShell with testId="dashboard" (see
    // UserDashboardPage.tsx) — its heading gets "dashboard-heading".
    // Canvas override uses testId="canvas-user-dashboard".
    expect(screen.getByTestId("dashboard-heading")).toBeDefined();
    expect(screen.queryByTestId("canvas-user-dashboard")).toBeNull();
  });

  it("MyProjectsPage renders the legacy body when no override is resolved", async () => {
    const { MyProjectsPage } = await import("../pages/user/MyProjectsPage");
    renderPage(<MyProjectsPage />);
    // Legacy body uses PageShell with testId="my-projects". Canvas body uses
    // testId="canvas-my-projects".
    expect(screen.getByTestId("my-projects-heading")).toBeDefined();
    expect(screen.queryByTestId("canvas-my-projects")).toBeNull();
  });

  it("ProjectDetailPage renders the legacy body when no override is resolved", async () => {
    const { ProjectDetailPage } = await import("../pages/user/ProjectDetailPage");
    renderPage(<ProjectDetailPage />, { initialRoute: "/user/projects/p-1" });
    // Legacy body uses PageShell with testId="project-detail" in the success
    // branch (loading/error branches use different testIds). Canvas override
    // uses testId="canvas-project-detail".
    expect(screen.getByTestId("project-detail-heading")).toBeDefined();
    expect(screen.queryByTestId("canvas-project-detail")).toBeNull();
  });
});
