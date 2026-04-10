/**
 * Canvas user shell smoke test — Faz 3.
 *
 * Mounts each Canvas override page in isolation against mocked hooks to
 * prove:
 *
 *   1. The dashboard override renders its hero + workspace stats + both
 *      columns with project/job data from the mocked hooks.
 *   2. The projects grid override renders project cards from the mocked
 *      `useContentProjects` hook and honors filter controls.
 *   3. The project detail override renders hero/preview/metadata/jobs
 *      from a single `useContentProject` + `fetchJobs` fixture.
 *
 * This is a smoke test — it does NOT exercise the surface resolver. That
 * path is covered by `canvas-user-surface.unit.test.ts` and the shared
 * `surfaces-page-override-hook.smoke.test.tsx`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Common mocks — each test imports its page lazily AFTER these are set up.
// ---------------------------------------------------------------------------

vi.mock("../stores/authStore", () => ({
  useAuthStore: (selector: (s: { user: { id: string; display_name: string } }) => unknown) =>
    selector({ user: { id: "u-1", display_name: "Canvas Tester" } }),
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
        profile_name: "Test Kanali",
        channel_slug: "test",
        default_language: "tr",
        status: "active",
      },
    ],
    isLoading: false,
  }),
}));

const sampleProject = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "p-1",
  user_id: "u-1",
  channel_profile_id: "ch-1",
  module_type: "standard_video",
  title: "Canvas Project",
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
      sampleProject({ id: "p-1", title: "Canvas Project A" }),
      sampleProject({
        id: "p-2",
        title: "Canvas Project B",
        content_status: "draft",
      }),
    ],
    isLoading: false,
    isError: false,
  }),
  useContentProject: () => ({
    data: sampleProject({ id: "p-1", title: "Canvas Project Detail" }),
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

function mountCanvasPage(
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

describe("Canvas user shell — override pages smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CanvasUserDashboardPage renders hero + stats + active projects tile", async () => {
    const { CanvasUserDashboardPage } = await import(
      "../surfaces/canvas/CanvasUserDashboardPage"
    );
    mountCanvasPage(<CanvasUserDashboardPage />);
    expect(screen.getByTestId("canvas-user-dashboard")).toBeDefined();
    expect(screen.getByTestId("canvas-dashboard-hero")).toBeDefined();
    expect(screen.getByTestId("canvas-dashboard-stats")).toBeDefined();
    // Project tile from fixture — uses canvas-project-tile-{id} testid.
    expect(screen.getByTestId("canvas-project-tile-p-1")).toBeDefined();
    expect(screen.getByTestId("canvas-project-tile-p-2")).toBeDefined();
  });

  it("CanvasMyProjectsPage renders a card grid with one card per fixture project", async () => {
    const { CanvasMyProjectsPage } = await import(
      "../surfaces/canvas/CanvasMyProjectsPage"
    );
    mountCanvasPage(<CanvasMyProjectsPage />);
    expect(screen.getByTestId("canvas-my-projects")).toBeDefined();
    expect(screen.getByTestId("canvas-projects-grid")).toBeDefined();
    expect(screen.getByTestId("canvas-project-card-p-1")).toBeDefined();
    expect(screen.getByTestId("canvas-project-card-p-2")).toBeDefined();
    // Filter controls are present.
    expect(screen.getByTestId("canvas-filter-channel")).toBeDefined();
    expect(screen.getByTestId("canvas-filter-module")).toBeDefined();
    expect(screen.getByTestId("canvas-filter-status")).toBeDefined();
  });

  it("CanvasProjectDetailPage renders hero + preview slot + metadata + jobs panels", async () => {
    const { CanvasProjectDetailPage } = await import(
      "../surfaces/canvas/CanvasProjectDetailPage"
    );
    mountCanvasPage(<CanvasProjectDetailPage />, {
      initialRoute: "/user/projects/p-1",
    });
    expect(screen.getByTestId("canvas-project-detail")).toBeDefined();
    expect(screen.getByTestId("canvas-project-hero")).toBeDefined();
    expect(screen.getByTestId("canvas-project-preview-slot")).toBeDefined();
    expect(screen.getByTestId("canvas-project-metadata")).toBeDefined();
    expect(screen.getByTestId("canvas-project-jobs")).toBeDefined();
  });
});
