/**
 * Bridge inline action capability-gating smoke test — Faz 2A.
 *
 * Verifies that the BridgeJobsRegistryPage drawer honors the backend's
 * `fetchAllowedActions` response and does NOT allow illegal state
 * transitions. The state machine stays on the server — this test guards the
 * client from ever *trying* to call cancel/retry when the backend says no.
 *
 * Scenarios:
 *   1. Running job + can_cancel=true / can_retry=false → Cancel enabled,
 *      Retry disabled.
 *   2. Failed job + can_retry=true / can_cancel=false → Retry enabled,
 *      Cancel disabled.
 *   3. Clicking a disabled button does NOT call its mutation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------- Stubs: one mock module per external dep ----------------------

const cancelCalls: string[] = [];
const retryCalls: string[] = [];
const cloneCalls: string[] = [];

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
      elapsed_total_seconds: 120,
      estimated_remaining_seconds: 60,
      elapsed_seconds: 120,
      eta_seconds: 60,
      workspace_path: null,
      last_error: null,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: null,
      updated_at: new Date().toISOString(),
      steps: [],
    },
    {
      id: "job-failed-1",
      module_type: "news_bulletin",
      status: "failed",
      owner_id: null,
      template_id: null,
      source_context_json: null,
      current_step_key: "script",
      retry_count: 1,
      elapsed_total_seconds: 45,
      estimated_remaining_seconds: null,
      elapsed_seconds: 45,
      eta_seconds: null,
      workspace_path: null,
      last_error: "provider timeout",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps: [],
    },
  ]),
  fetchAllowedActions: vi.fn(async (jobId: string) => {
    if (jobId === "job-running-1") {
      return {
        can_cancel: true,
        can_retry: false,
        can_clone: true,
        skippable_steps: [],
      };
    }
    if (jobId === "job-failed-1") {
      return {
        can_cancel: false,
        can_retry: true,
        can_clone: true,
        skippable_steps: [],
      };
    }
    return {
      can_cancel: false,
      can_retry: false,
      can_clone: false,
      skippable_steps: [],
    };
  }),
  cancelJob: vi.fn(async (jobId: string) => {
    cancelCalls.push(jobId);
    return { id: jobId };
  }),
  retryJob: vi.fn(async (jobId: string) => {
    retryCalls.push(jobId);
    return { id: jobId };
  }),
  cloneJob: vi.fn(async (jobId: string) => {
    cloneCalls.push(jobId);
    return { id: "cloned-" + jobId };
  }),
  markJobsAsTestData: vi.fn(async () => ({ marked_count: 1 })),
}));

// Stub out the heavy JobDetailPanel — it isn't what we're asserting.
vi.mock("../components/jobs/JobDetailPanel", () => ({
  JobDetailPanel: () => <div data-testid="job-detail-panel-stub" />,
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// ---------- Helpers ------------------------------------------------------

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Import lazily so the mocks above take effect.
  return import("../surfaces/bridge/BridgeJobsRegistryPage").then(
    ({ BridgeJobsRegistryPage }) => {
      return render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <BridgeJobsRegistryPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    },
  );
}

// ---------- Tests --------------------------------------------------------

describe("Bridge inline actions — capability gating (Faz 2A)", () => {
  beforeEach(() => {
    cancelCalls.length = 0;
    retryCalls.length = 0;
    cloneCalls.length = 0;
    vi.clearAllMocks();
  });

  it("running job: Cancel enabled, Retry disabled (respects allowed-actions)", async () => {
    await renderPage();

    // Wait for the list row to render, then select the running job.
    const runningRow = await screen.findByTestId("bridge-jobs-row-job-running-1");
    fireEvent.click(runningRow);

    // Wait for allowed-actions to resolve and buttons to update.
    const cancelBtn = await screen.findByTestId("bridge-jobs-drawer-cancel");
    const retryBtn = await screen.findByTestId("bridge-jobs-drawer-retry");

    await waitFor(() => {
      expect((cancelBtn as HTMLButtonElement).disabled).toBe(false);
    });
    expect((retryBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("failed job: Retry enabled, Cancel disabled", async () => {
    await renderPage();

    const failedRow = await screen.findByTestId("bridge-jobs-row-job-failed-1");
    fireEvent.click(failedRow);

    const retryBtn = await screen.findByTestId("bridge-jobs-drawer-retry");
    const cancelBtn = await screen.findByTestId("bridge-jobs-drawer-cancel");

    await waitFor(() => {
      expect((retryBtn as HTMLButtonElement).disabled).toBe(false);
    });
    expect((cancelBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("clicking a disabled Retry on a running job does NOT call retryJob", async () => {
    await renderPage();

    const runningRow = await screen.findByTestId("bridge-jobs-row-job-running-1");
    fireEvent.click(runningRow);

    const retryBtn = (await screen.findByTestId(
      "bridge-jobs-drawer-retry",
    )) as HTMLButtonElement;
    // Wait for allowed-actions to load so the button is correctly gated.
    await waitFor(() => {
      expect(retryBtn.disabled).toBe(true);
    });

    fireEvent.click(retryBtn);
    // A disabled button should not fire the mutation.
    expect(retryCalls).toEqual([]);
  });

  it("clicking enabled Cancel on a running job DOES call cancelJob", async () => {
    await renderPage();

    const runningRow = await screen.findByTestId("bridge-jobs-row-job-running-1");
    fireEvent.click(runningRow);

    const cancelBtn = (await screen.findByTestId(
      "bridge-jobs-drawer-cancel",
    )) as HTMLButtonElement;
    await waitFor(() => {
      expect(cancelBtn.disabled).toBe(false);
    });

    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(cancelCalls).toEqual(["job-running-1"]);
    });
  });
});
