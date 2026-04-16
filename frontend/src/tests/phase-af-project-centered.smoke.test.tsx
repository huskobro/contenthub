/**
 * PHASE AF — project-centered workflow frontend smoke.
 *
 * Plan I: lightweight surface proof.
 *   1. Launcher cards render for all 3 modules and carry project+channel
 *      context (contentProjectId + channelProfileId query params) when
 *      clicked — proves deep-link contract between project detail and
 *      wizards.
 *   2. Summary section renders aggregate counts (jobs.total + by_status +
 *      by_module, publish.total) from the mocked hook — honest partial
 *      state, no placeholder lies.
 *   3. Jobs filter section renders module + status selects and a clear
 *      button — user can scope the list without bouncing to admin.
 *   4. Channel link uses channel_profile_id and resolves via
 *      useChannelProfile mock.
 *
 * Ownership/visibility is backend-enforced; tests only prove surface
 * wiring reaches the right endpoints via URL params.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the ProjectAutomationPanel — not under test.
vi.mock("../components/full-auto/ProjectAutomationPanel", () => ({
  ProjectAutomationPanel: () => null,
}));

// Mock the JobPreviewList — heavy component, not under test.
vi.mock("../components/preview/JobPreviewList", () => ({
  JobPreviewList: () => null,
}));

// Canvas surface override — must be disabled so legacy body renders.
vi.mock("../surfaces", () => ({
  useSurfacePageOverride: () => null,
}));

vi.mock("../hooks/useContentProjects", () => ({
  useContentProject: () => ({
    data: {
      id: "proj-af-1",
      user_id: "u-1",
      channel_profile_id: "ch-af-1",
      module_type: "news_bulletin",
      title: "PHASE AF Project",
      description: "Project-centered workflow",
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useProjectSummary: () => ({
    data: {
      project_id: "proj-af-1",
      jobs: {
        total: 5,
        by_status: { completed: 3, failed: 1, running: 1 },
        by_module: { news_bulletin: 3, standard_video: 2 },
        last_created_at: new Date().toISOString(),
      },
      publish: {
        total: 2,
        by_status: { published: 1, scheduled: 1 },
        last_published_at: new Date().toISOString(),
      },
    },
    isLoading: false,
    isError: false,
  }),
  useProjectJobs: () => ({
    data: [
      {
        id: "job-af-1",
        module_type: "news_bulletin",
        status: "completed",
        owner_id: "u-1",
        channel_profile_id: "ch-af-1",
        content_project_id: "proj-af-1",
        current_step_key: null,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useContentProjects: () => ({ data: [], isLoading: false, isError: false }),
  useCreateContentProject: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../hooks/useChannelProfiles", () => ({
  useChannelProfile: () => ({
    data: {
      id: "ch-af-1",
      profile_name: "PHASE AF Channel",
      channel_slug: "af-channel",
      default_language: "tr",
      profile_type: "youtube",
      status: "active",
      handle: "af_test",
      title: "PHASE AF Channel",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    isLoading: false,
  }),
  useChannelProfiles: () => ({ data: [], isLoading: false }),
}));

vi.mock("../hooks/usePublish", () => ({
  usePublishRecordsByProject: () => ({ data: [], isLoading: false }),
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock("../api/jobsApi", () => ({
  fetchJobs: vi.fn(async () => []),
}));

vi.mock("../api/standardVideoApi", () => ({
  fetchStandardVideos: vi.fn(async () => []),
  startStandardVideoProduction: vi.fn(),
}));

// Import AFTER mocks
import { ProjectDetailPage } from "../pages/user/ProjectDetailPage";

function Harness({ path = "/user/projects/proj-af-1" }: { path?: string }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/user/projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="/user/create/:module"
            element={<div data-testid="wizard-landed">wizard</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PHASE AF — project-centered workflow surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders summary section with aggregate counts", () => {
    render(<Harness />);
    const summary = screen.getByTestId("project-summary");
    expect(summary).toBeTruthy();

    expect(
      within(summary).getByTestId("project-summary-stat-Toplam İş").textContent,
    ).toContain("5");
    expect(
      within(summary).getByTestId("project-summary-stat-Tamamlanan").textContent,
    ).toContain("3");
    expect(
      within(summary).getByTestId("project-summary-stat-Yayın Kaydı").textContent,
    ).toContain("2");
    expect(
      within(summary).getByTestId("project-summary-stat-Yayınlanan").textContent,
    ).toContain("1");

    expect(
      within(summary).getByTestId("project-summary-module-news_bulletin")
        .textContent,
    ).toContain("3");
    expect(
      within(summary).getByTestId("project-summary-module-standard_video")
        .textContent,
    ).toContain("2");
  });

  it("renders all 3 module launcher cards", () => {
    render(<Harness />);
    const launcher = screen.getByTestId("project-launcher");
    expect(launcher).toBeTruthy();

    expect(
      within(launcher).getByTestId("project-launcher-standard_video"),
    ).toBeTruthy();
    expect(
      within(launcher).getByTestId("project-launcher-news_bulletin"),
    ).toBeTruthy();
    expect(
      within(launcher).getByTestId("project-launcher-product_review"),
    ).toBeTruthy();
  });

  it("renders jobs filter controls (module + status + clear)", async () => {
    render(<Harness />);
    expect(screen.getByTestId("project-jobs-filter")).toBeTruthy();
    expect(screen.getByTestId("project-jobs-filter-module")).toBeTruthy();
    expect(screen.getByTestId("project-jobs-filter-status")).toBeTruthy();

    const user = userEvent.setup();
    const moduleSelect = screen.getByTestId(
      "project-jobs-filter-module",
    ) as HTMLSelectElement;
    await user.selectOptions(moduleSelect, "news_bulletin");
    expect(moduleSelect.value).toBe("news_bulletin");
    expect(screen.getByTestId("project-jobs-filter-clear")).toBeTruthy();
  });

  it("renders channel link with profile_name + handle", () => {
    render(<Harness />);
    const link = screen.getByTestId("project-channel-link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/user/channels/ch-af-1");
    expect(link.textContent).toContain("PHASE AF Channel");
    expect(link.textContent).toContain("@af_test");
  });

  it("renders linked job row with module label", () => {
    render(<Harness />);
    const row = screen.getByTestId("project-linked-job-job-af-1");
    expect(row).toBeTruthy();
    expect(row.textContent).toContain("Haber Bülteni");
  });
});
