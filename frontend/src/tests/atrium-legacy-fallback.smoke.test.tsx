/**
 * Atrium legacy fallback smoke test — Faz 4.
 *
 * Verifies the trampoline pattern for the three user pages that Atrium
 * promotes in Faz 4:
 *   - UserDashboardPage   → atrium override key `user.dashboard`
 *   - MyProjectsPage      → atrium override key `user.projects.list`
 *   - ProjectDetailPage   → atrium override key `user.projects.detail`
 *
 * Each page calls `useSurfacePageOverride(key)` at render time. When NO
 * SurfaceProvider is mounted (the default in this test), the override hook
 * returns null, so the legacy body MUST render AND the Atrium body must
 * stay absent.
 *
 * This is the Faz 4 twin of canvas-legacy-fallback.smoke.test.tsx — the
 * canvas test already exercises the trampoline path, but we keep an
 * atrium-specific negative assertion so a future regression that
 * accidentally leaks atrium content into the legacy tree is caught by a
 * test whose name actually points at atrium.
 *
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
  useAuthStore: (
    selector: (s: { user: { id: string; display_name: string } }) => unknown,
  ) =>
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

describe("Atrium trampoline — legacy user pages render without SurfaceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "UserDashboardPage renders the legacy body and does NOT leak atrium content",
    async () => {
      const { UserDashboardPage } = await import("../pages/UserDashboardPage");
      renderPage(<UserDashboardPage />);
      // Legacy PageShell marker.
      expect(screen.getByTestId("dashboard-heading")).toBeDefined();
      // Atrium override body must be absent.
      expect(screen.queryByTestId("atrium-user-dashboard")).toBeNull();
      expect(screen.queryByTestId("atrium-dashboard-hero")).toBeNull();
    },
    // UserDashboardPage pulls in a large subtree; under full-suite load the
    // first lazy import on a cold module graph can exceed the 5s default.
    // Targeted runs finish in ~2.3s — extend to 15s to stay green under load.
    15000,
  )

  it("MyProjectsPage renders the legacy body and does NOT leak atrium portfolio", async () => {
    const { MyProjectsPage } = await import("../pages/user/MyProjectsPage");
    renderPage(<MyProjectsPage />);
    expect(screen.getByTestId("my-projects-heading")).toBeDefined();
    expect(screen.queryByTestId("atrium-projects-list")).toBeNull();
    expect(screen.queryByTestId("atrium-projects-hero")).toBeNull();
  });

  it("ProjectDetailPage renders the legacy body and does NOT leak atrium showcase", async () => {
    const { ProjectDetailPage } = await import("../pages/user/ProjectDetailPage");
    renderPage(<ProjectDetailPage />, { initialRoute: "/user/projects/p-1" });
    expect(screen.getByTestId("project-detail-heading")).toBeDefined();
    expect(screen.queryByTestId("atrium-project-detail")).toBeNull();
    expect(screen.queryByTestId("atrium-project-hero")).toBeNull();
  });
});
