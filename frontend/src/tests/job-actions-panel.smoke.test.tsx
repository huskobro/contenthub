import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JobDetailPage } from "../pages/admin/JobDetailPage";
import type { JobResponse } from "../api/jobsApi";

const MOCK_RUNNING_JOB: JobResponse = {
  id: "j-run-1",
  module_type: "standard_video",
  status: "running",
  owner_id: null,
  template_id: null,
  source_context_json: null,
  current_step_key: "script",
  retry_count: 0,
  elapsed_total_seconds: 30,
  estimated_remaining_seconds: 120,
  workspace_path: null,
  last_error: null,
  created_at: "2026-04-01T10:00:00Z",
  started_at: "2026-04-01T10:00:05Z",
  finished_at: null,
  updated_at: "2026-04-01T10:00:35Z",
  steps: [
    {
      id: "s1",
      job_id: "j-run-1",
      step_key: "script",
      step_order: 1,
      status: "running",
      artifact_refs_json: null,
      provider_trace_json: null,
      log_text: null,
      elapsed_seconds: 30,
      last_error: null,
      created_at: "2026-04-01T10:00:05Z",
      started_at: "2026-04-01T10:00:05Z",
      finished_at: null,
      updated_at: "2026-04-01T10:00:35Z",
    },
  ],
};

const MOCK_ALLOWED_ACTIONS = {
  can_cancel: true,
  can_retry: false,
  skippable_steps: [],
};

const MOCK_FAILED_ACTIONS = {
  can_cancel: false,
  can_retry: true,
  skippable_steps: [],
};

function renderJobDetail(job: JobResponse, actions: unknown) {
  window.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/allowed-actions")) {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(actions),
      });
    }
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(job),
    });
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/jobs/:jobId", element: <JobDetailPage /> }],
    { initialEntries: ["/admin/jobs/j-run-1"] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Job Actions Panel smoke tests", () => {
  it("renders actions panel with heading", async () => {
    renderJobDetail(MOCK_RUNNING_JOB, MOCK_ALLOWED_ACTIONS);
    await waitFor(() => {
      expect(screen.getByTestId("job-actions-panel")).toBeDefined();
      expect(screen.getByText("Operasyonel Aksiyonlar")).toBeDefined();
    });
  });

  it("shows cancel button enabled for running job", async () => {
    renderJobDetail(MOCK_RUNNING_JOB, MOCK_ALLOWED_ACTIONS);
    await waitFor(() => {
      const btn = screen.getByTestId("action-cancel");
      expect(btn).toBeDefined();
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("shows retry button disabled for running job", async () => {
    renderJobDetail(MOCK_RUNNING_JOB, MOCK_ALLOWED_ACTIONS);
    await waitFor(() => {
      const btn = screen.getByTestId("action-retry");
      expect(btn).toBeDefined();
      expect(btn.hasAttribute("disabled")).toBe(true);
    });
  });

  it("shows status info text", async () => {
    renderJobDetail(MOCK_RUNNING_JOB, MOCK_ALLOWED_ACTIONS);
    await waitFor(() => {
      expect(screen.getByText(/Mevcut durum:/)).toBeDefined();
    });
  });
});
