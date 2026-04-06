import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { JobDetailPage } from "../pages/admin/JobDetailPage";
import { JobsRegistryPage } from "../pages/admin/JobsRegistryPage";
import type { JobResponse } from "../api/jobsApi";

const MOCK_JOB: JobResponse = {
  id: "j1",
  module_type: "standard_video",
  status: "running",
  owner_id: null,
  template_id: null,
  source_context_json: null,
  current_step_key: "script",
  retry_count: 1,
  elapsed_total_seconds: 90,
  estimated_remaining_seconds: 120,
  workspace_path: "/workspace/j1",
  last_error: null,
  created_at: "2026-04-01T10:00:00Z",
  started_at: "2026-04-01T10:00:05Z",
  finished_at: null,
  elapsed_seconds: null,
  eta_seconds: null,
  updated_at: "2026-04-01T10:01:30Z",
  steps: [
    {
      id: "s1",
      job_id: "j1",
      step_key: "script",
      step_order: 1,
      status: "running",
      artifact_refs_json: null,
      provider_trace_json: JSON.stringify({
        provider_trace: {
          provider_name: "openai",
          provider_kind: "llm",
          model: "gpt-4o",
          success: true,
          latency_ms: 2340,
          input_tokens: 500,
          output_tokens: 1200,
        },
      }),
      log_text: null,
      elapsed_seconds: 90,
      elapsed_seconds_live: null,
      eta_seconds: null,
      last_error: null,
      created_at: "2026-04-01T10:00:05Z",
      started_at: "2026-04-01T10:00:05Z",
      finished_at: null,
      updated_at: "2026-04-01T10:01:30Z",
    },
  ],
};

function renderDetailPage(fetchFn: typeof window.fetch) {
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
          { path: "jobs", element: <JobsRegistryPage /> },
          { path: "jobs/:jobId", element: <JobDetailPage /> },
        ],
      },
    ],
    { initialEntries: ["/admin/jobs/j1"] }
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

describe("Job Detail Page smoke tests", () => {
  it("renders job detail page heading", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(MOCK_JOB),
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/jobs/:jobId", element: <JobDetailPage /> }],
      { initialEntries: ["/admin/jobs/j1"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Job Detayı" })).toBeDefined();
    });
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/jobs/:jobId", element: <JobDetailPage /> }],
      { initialEntries: ["/admin/jobs/j1"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("shows job overview panel with job data", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(MOCK_JOB),
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/jobs/:jobId", element: <JobDetailPage /> }],
      { initialEntries: ["/admin/jobs/j1"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Genel Bilgi")).toBeDefined();
      expect(screen.getByText("standard_video")).toBeDefined();
    });
  });

  it("shows timeline panel with steps", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(MOCK_JOB),
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/jobs/:jobId", element: <JobDetailPage /> }],
      { initialEntries: ["/admin/jobs/j1"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Timeline")).toBeDefined();
      // step_key "script" appears in timeline
      expect(screen.getAllByText("script").length).toBeGreaterThan(0);
    });
  });

  it("shows system panels (logs, artifacts, provider trace)", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(MOCK_JOB),
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/jobs/:jobId", element: <JobDetailPage /> }],
      { initialEntries: ["/admin/jobs/j1"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Logs")).toBeDefined();
      expect(screen.getByText("Artifacts")).toBeDefined();
      expect(screen.getByText("Provider Trace")).toBeDefined();
    });
  });
});
