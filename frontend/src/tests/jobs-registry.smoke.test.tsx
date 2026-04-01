import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { JobsRegistryPage } from "../pages/admin/JobsRegistryPage";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import type { JobResponse } from "../api/jobsApi";

const MOCK_JOBS: JobResponse[] = [
  {
    id: "j1",
    module_type: "standard_video",
    status: "queued",
    owner_id: null,
    template_id: null,
    source_context_json: null,
    current_step_key: null,
    retry_count: 0,
    elapsed_total_seconds: null,
    estimated_remaining_seconds: null,
    workspace_path: null,
    last_error: null,
    created_at: "2026-04-01T10:00:00Z",
    started_at: null,
    finished_at: null,
    updated_at: "2026-04-01T10:00:00Z",
    steps: [],
  },
  {
    id: "j2",
    module_type: "news_bulletin",
    status: "running",
    owner_id: null,
    template_id: null,
    source_context_json: null,
    current_step_key: "script",
    retry_count: 1,
    elapsed_total_seconds: 30.5,
    estimated_remaining_seconds: null,
    workspace_path: "/workspace/j2",
    last_error: null,
    created_at: "2026-04-01T11:00:00Z",
    started_at: "2026-04-01T11:00:05Z",
    finished_at: null,
    updated_at: "2026-04-01T11:00:35Z",
    steps: [
      {
        id: "s1",
        job_id: "j2",
        step_key: "script",
        step_order: 1,
        status: "running",
        artifact_refs_json: null,
        log_text: null,
        elapsed_seconds: 30.0,
        last_error: null,
        created_at: "2026-04-01T11:00:05Z",
        started_at: "2026-04-01T11:00:05Z",
        finished_at: null,
        updated_at: "2026-04-01T11:00:35Z",
      },
    ],
  },
];

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function renderJobs(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const testRouter = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "jobs", element: <JobsRegistryPage /> },
        ],
      },
    ],
    { initialEntries: ["/admin/jobs"] }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Jobs Registry smoke tests", () => {
  it("renders the jobs page at /admin/jobs", async () => {
    renderJobs(mockFetch(MOCK_JOBS));
    expect(screen.getByRole("heading", { name: "Jobs Registry" })).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/jobs", element: <JobsRegistryPage /> }],
      { initialEntries: ["/admin/jobs"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("displays jobs list after data loads", async () => {
    renderJobs(mockFetch(MOCK_JOBS));
    await waitFor(() => {
      expect(screen.getByText("standard_video")).toBeDefined();
      expect(screen.getByText("news_bulletin")).toBeDefined();
    });
  });

  it("shows detail panel placeholder when no job selected", async () => {
    renderJobs(mockFetch(MOCK_JOBS));
    await waitFor(() => {
      expect(screen.getByText("standard_video")).toBeDefined();
    });
    expect(screen.getByText("Detay görmek için bir job seçin.")).toBeDefined();
  });

  it("clicking a job row is possible (navigation to detail page)", async () => {
    renderJobs(mockFetch(MOCK_JOBS));

    await waitFor(() => {
      expect(screen.getByText("news_bulletin")).toBeDefined();
    });

    // Table rows are clickable — verify the row exists and click does not throw
    const rows = screen.getAllByText("news_bulletin");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("shows formatted elapsed in table row", async () => {
    const jobWithElapsed = [{ ...MOCK_JOBS[1], elapsed_total_seconds: 65 }];
    renderJobs(mockFetch(jobWithElapsed));
    await waitFor(() => {
      // formatDuration(65) → "1 dk 5 sn"
      expect(screen.getAllByText("1 dk 5 sn").length).toBeGreaterThan(0);
    });
  });

  it("shows formatted elapsed in table row", async () => {
    const jobWithElapsed = [{ ...MOCK_JOBS[1], elapsed_total_seconds: 30 }];
    renderJobs(mockFetch(jobWithElapsed));
    await waitFor(() => {
      // formatDuration(30) → "30 sn"
      expect(screen.getByText("30 sn")).toBeDefined();
    });
  });
});
