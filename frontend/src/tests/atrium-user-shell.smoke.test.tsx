/**
 * Atrium user shell smoke test — Faz 4.
 *
 * Mounts each Atrium override page in isolation against mocked hooks to
 * prove:
 *
 *   1. The premium dashboard override renders its cover hero + headline
 *      project slot + editorial lineup/in-production/attention blocks and
 *      vital stats strip from the mocked hooks.
 *   2. The portfolio list override renders a dark hero + filter pills + a
 *      card grid with one PortfolioCard per fixture project.
 *   3. The project detail override renders the showcase hero (preview slot
 *      + actions) plus the jobs panel and the editorial metadata rail.
 *
 * This is a smoke test — it does NOT exercise the surface resolver. That
 * path is covered by `atrium-user-surface.unit.test.ts`, the shared
 * `surfaces-page-override-hook.smoke.test.tsx`, and the scope/fallback
 * assertions in `surfaces-layout-switch.smoke.test.tsx`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Common mocks — each test imports its page lazily AFTER these are set up so
// the module graph never pulls in a live backend.
// ---------------------------------------------------------------------------

vi.mock("../stores/authStore", () => ({
  useAuthStore: (
    selector: (s: { user: { id: string; display_name: string } }) => unknown,
  ) =>
    selector({ user: { id: "u-1", display_name: "Atrium Tester" } }),
}));

vi.mock("../hooks/useOnboardingStatus", () => ({
  useOnboardingStatus: () => ({
    data: { onboarding_required: false },
    isLoading: false,
  }),
}));

vi.mock("../hooks/useChannelProfiles", () => ({
  useChannelProfiles: () => ({
    data: [
      {
        id: "ch-1",
        profile_name: "Atrium Kanali",
        channel_slug: "atrium",
        default_language: "tr",
        status: "active",
      },
    ],
    isLoading: false,
  }),
  useChannelProfile: () => ({
    data: {
      id: "ch-1",
      profile_name: "Atrium Kanali",
      channel_slug: "atrium",
      default_language: "tr",
      status: "active",
    },
    isLoading: false,
  }),
}));

const sampleProject = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "p-1",
  user_id: "u-1",
  channel_profile_id: "ch-1",
  module_type: "standard_video",
  title: "Atrium Project",
  description: null,
  current_stage: null,
  content_status: "in_progress",
  review_status: "not_required",
  publish_status: "unpublished",
  primary_platform: null,
  origin_type: "manual",
  priority: "normal",
  deadline_at: null,
  active_job_id: null,
  latest_output_ref: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

vi.mock("../hooks/useContentProjects", () => ({
  useContentProjects: () => ({
    data: [
      sampleProject({
        id: "p-1",
        title: "Atrium Headline Project",
        priority: "high",
      }),
      sampleProject({
        id: "p-2",
        title: "Atrium Draft",
        content_status: "draft",
      }),
    ],
    isLoading: false,
    isError: false,
  }),
  useContentProject: () => ({
    data: sampleProject({
      id: "p-1",
      title: "Atrium Detail Headline",
      description: "Editorial showcase detail.",
    }),
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCreateContentProject: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../api/jobsApi", () => ({
  fetchJobs: vi.fn(async () => [
    {
      id: "job-running-1",
      module_type: "standard_video",
      status: "running",
      owner_id: null,
      template_id: null,
      source_context_json: null,
      current_step_key: "render",
      retry_count: 0,
      elapsed_total_seconds: 60,
      estimated_remaining_seconds: 60,
      elapsed_seconds: 60,
      eta_seconds: 60,
      workspace_path: null,
      last_error: null,
      content_project_id: "p-1",
      created_at: "2026-01-01T00:00:00Z",
      started_at: "2026-01-01T00:00:00Z",
      finished_at: null,
      updated_at: "2026-01-01T00:00:00Z",
      steps: [],
    },
  ]),
}));

vi.mock("../api/standardVideoApi", () => ({
  fetchStandardVideos: vi.fn(async () => []),
  startStandardVideoProduction: vi.fn(async () => ({ job_id: "j-1" })),
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function mountAtriumPage(
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

describe("Atrium user shell — override pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AtriumUserDashboardPage renders cover hero + headline slot + editorial blocks", async () => {
    const { AtriumUserDashboardPage } = await import(
      "../surfaces/atrium/AtriumUserDashboardPage"
    );
    mountAtriumPage(<AtriumUserDashboardPage />);
    // Editorial cover + hero stats strip.
    expect(screen.getByTestId("atrium-user-dashboard")).toBeDefined();
    expect(screen.getByTestId("atrium-dashboard-hero")).toBeDefined();
    expect(screen.getByTestId("atrium-dashboard-hero-stats")).toBeDefined();
    // Headline project picks the "high" priority fixture (p-1).
    expect(screen.getByTestId("atrium-dashboard-headline")).toBeDefined();
    // Editorial blocks — lineup + in-production + attention + stats strip.
    expect(screen.getByTestId("atrium-dashboard-lineup")).toBeDefined();
    expect(screen.getByTestId("atrium-dashboard-in-production")).toBeDefined();
    expect(screen.getByTestId("atrium-dashboard-attention")).toBeDefined();
    expect(screen.getByTestId("atrium-dashboard-stats")).toBeDefined();
  });

  it("AtriumProjectsListPage renders portfolio hero + filter strip + PortfolioCard grid", async () => {
    const { AtriumProjectsListPage } = await import(
      "../surfaces/atrium/AtriumProjectsListPage"
    );
    mountAtriumPage(<AtriumProjectsListPage />);
    expect(screen.getByTestId("atrium-projects-list")).toBeDefined();
    expect(screen.getByTestId("atrium-projects-hero")).toBeDefined();
    expect(screen.getByTestId("atrium-projects-filters")).toBeDefined();
    expect(screen.getByTestId("atrium-projects-filter-module")).toBeDefined();
    expect(screen.getByTestId("atrium-projects-filter-status")).toBeDefined();
    expect(screen.getByTestId("atrium-projects-filter-channel")).toBeDefined();
    // Grid + one card per fixture project.
    expect(screen.getByTestId("atrium-projects-grid")).toBeDefined();
    expect(screen.getByTestId("atrium-portfolio-card-p-1")).toBeDefined();
    expect(screen.getByTestId("atrium-portfolio-card-p-2")).toBeDefined();
    // Preview bands are explicit placeholders (preview-honest discipline).
    expect(screen.getByTestId("atrium-portfolio-preview-p-1")).toBeDefined();
    expect(screen.getByTestId("atrium-portfolio-preview-p-2")).toBeDefined();
  });

  it("AtriumProjectDetailPage renders showcase hero + preview slot + jobs panel + metadata rail", async () => {
    const { AtriumProjectDetailPage } = await import(
      "../surfaces/atrium/AtriumProjectDetailPage"
    );
    mountAtriumPage(<AtriumProjectDetailPage />, {
      initialRoute: "/user/projects/p-1",
    });
    expect(screen.getByTestId("atrium-project-detail")).toBeDefined();
    expect(screen.getByTestId("atrium-project-hero")).toBeDefined();
    // Large preview placeholder — showcase + control balance.
    expect(screen.getByTestId("atrium-project-preview-slot")).toBeDefined();
    // Jobs and metadata rail live in the two-column body.
    expect(screen.getByTestId("atrium-project-jobs")).toBeDefined();
    expect(screen.getByTestId("atrium-project-metadata")).toBeDefined();
  });
});
