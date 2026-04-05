import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsOperationsPage } from "../pages/admin/AnalyticsOperationsPage";
import type { OperationsMetrics } from "../api/analyticsApi";

const MOCK_OPERATIONS: OperationsMetrics = {
  window: "last_30d",
  avg_render_duration_seconds: 45.3,
  step_stats: [
    { step_key: "script", count: 38, avg_elapsed_seconds: 12.4, failed_count: 1 },
    { step_key: "composition", count: 35, avg_elapsed_seconds: 45.3, failed_count: 2 },
    { step_key: "tts", count: 36, avg_elapsed_seconds: 8.1, failed_count: 0 },
  ],
  provider_error_rate: null,
  provider_stats: [],
};

const MOCK_OPERATIONS_EMPTY: OperationsMetrics = {
  window: "last_7d",
  avg_render_duration_seconds: null,
  step_stats: [],
  provider_error_rate: null,
  provider_stats: [],
};

function buildFetch(payload: OperationsMetrics) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
}

function renderPage(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const testRouter = createMemoryRouter(
    [{ path: "/admin/analytics/operations", element: <AnalyticsOperationsPage /> }],
    { initialEntries: ["/admin/analytics/operations"] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>,
  );
}

describe("AnalyticsOperationsPage smoke tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("A: renders heading", () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    expect(screen.getByTestId("analytics-operations-heading")).toBeTruthy();
  });

  it("B: renders window selector buttons", () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    expect(screen.getByTestId("window-btn-last_7d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-last_30d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-last_90d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-all_time")).toBeTruthy();
  });

  it("C: renders job performance section", () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    expect(screen.getByTestId("analytics-job-performance")).toBeTruthy();
  });

  it("D: renders step stats section", () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    expect(screen.getByTestId("analytics-step-stats")).toBeTruthy();
  });

  it("E: shows avg_render_duration formatted", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    await waitFor(() =>
      expect(screen.getByTestId("ops-metric-avg-render-value").textContent).toBe("45.3s"),
    );
  });

  it("F: shows — for null avg_render_duration (empty data)", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS_EMPTY));
    await waitFor(() =>
      expect(screen.getByTestId("ops-metric-avg-render-value").textContent).toBe("—"),
    );
  });

  it("G: shows step_stats table when data present", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    await waitFor(() =>
      expect(screen.getByTestId("step-stats-table")).toBeTruthy(),
    );
  });

  it("H: step table has row for each step_key", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    await waitFor(() => {
      expect(screen.getByTestId("step-row-script")).toBeTruthy();
      expect(screen.getByTestId("step-row-composition")).toBeTruthy();
      expect(screen.getByTestId("step-row-tts")).toBeTruthy();
    });
  });

  it("I: step with 0 failed_count shows 0", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    await waitFor(() => {
      const ttsRow = screen.getByTestId("step-row-tts");
      expect(ttsRow.textContent).toContain("0");
    });
  });

  it("J: shows empty state when step_stats is empty", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS_EMPTY));
    await waitFor(() =>
      expect(screen.getByTestId("step-stats-empty")).toBeTruthy(),
    );
  });

  it("K: no table when step_stats is empty", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS_EMPTY));
    await waitFor(() =>
      expect(screen.queryByTestId("step-stats-table")).toBeNull(),
    );
  });

  it("L: shows error state on fetch failure", async () => {
    const failFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    renderPage(failFetch as typeof window.fetch);
    await waitFor(() =>
      expect(screen.getByTestId("analytics-operations-error")).toBeTruthy(),
    );
  });

  it("M: window button click triggers re-fetch with new window", async () => {
    const fetchFn = buildFetch(MOCK_OPERATIONS);
    renderPage(fetchFn);
    fireEvent.click(screen.getByTestId("window-btn-last_7d"));
    await waitFor(() => {
      const calls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls;
      const urls = calls.map((c: unknown[]) => c[0] as string);
      expect(urls.some((u) => u.includes("window=last_7d"))).toBe(true);
    });
  });

  it("N: provider_error_rate shown as — (unsupported in M8-C2)", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    await waitFor(() =>
      expect(screen.getByTestId("ops-metric-provider-error-value").textContent).toBe("—"),
    );
  });
});
