import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsOverviewPage } from "../pages/admin/AnalyticsOverviewPage";
import type { OverviewMetrics } from "../api/analyticsApi";

const MOCK_OVERVIEW: OverviewMetrics = {
  window: "last_30d",
  total_job_count: 42,
  completed_job_count: 38,
  failed_job_count: 4,
  job_success_rate: 0.9048,
  total_publish_count: 30,
  published_count: 28,
  failed_publish_count: 2,
  publish_success_rate: 0.9333,
  avg_production_duration_seconds: 125.5,
  retry_rate: 0.0714,
};

const MOCK_OVERVIEW_EMPTY: OverviewMetrics = {
  window: "last_7d",
  total_job_count: 0,
  completed_job_count: 0,
  failed_job_count: 0,
  job_success_rate: null,
  total_publish_count: 0,
  published_count: 0,
  failed_publish_count: 0,
  publish_success_rate: null,
  avg_production_duration_seconds: null,
  retry_rate: null,
};

function buildFetch(payload: OverviewMetrics) {
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
    [{ path: "/admin/analytics", element: <AnalyticsOverviewPage /> }],
    { initialEntries: ["/admin/analytics"] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>,
  );
}

describe("AnalyticsOverviewPage smoke tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("A: renders heading", () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    expect(screen.getByTestId("analytics-overview-heading")).toBeTruthy();
  });

  it("B: renders window selector buttons", () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    expect(screen.getByTestId("window-btn-last_7d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-last_30d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-last_90d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-all_time")).toBeTruthy();
  });

  it("C: renders core metrics section", () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    expect(screen.getByTestId("analytics-core-metrics")).toBeTruthy();
  });

  it("D: renders publish metrics section", () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    expect(screen.getByTestId("analytics-publish-metrics")).toBeTruthy();
  });

  it("E: shows real total_job_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-total-jobs-value").textContent).toBe("42"),
    );
  });

  it("F: shows real completed_job_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-completed-jobs-value").textContent).toBe("38"),
    );
  });

  it("G: shows real failed_job_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-failed-jobs-value").textContent).toBe("4"),
    );
  });

  it("H: shows job_success_rate as percentage", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-job-success-rate-value").textContent).toBe("90.5%"),
    );
  });

  it("I: shows avg_production_duration_seconds formatted", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-avg-duration-value").textContent).toBe("2.1dk"),
    );
  });

  it("J: shows retry_rate as percentage", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-retry-rate-value").textContent).toBe("7.1%"),
    );
  });

  it("K: shows published_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-publish-count-value").textContent).toBe("28"),
    );
  });

  it("L: shows failed_publish_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-failed-publish-value").textContent).toBe("2"),
    );
  });

  it("M: shows publish_success_rate as percentage", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    await waitFor(() =>
      expect(screen.getByTestId("metric-publish-success-rate-value").textContent).toBe("93.3%"),
    );
  });

  it("N: shows — for null metrics (empty data)", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW_EMPTY));
    await waitFor(() =>
      expect(screen.getByTestId("metric-job-success-rate-value").textContent).toBe("—"),
    );
    expect(screen.getByTestId("metric-avg-duration-value").textContent).toBe("—");
    expect(screen.getByTestId("metric-retry-rate-value").textContent).toBe("—");
  });

  it("O: shows error state on fetch failure", async () => {
    const failFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    renderPage(failFetch as typeof window.fetch);
    await waitFor(() =>
      expect(screen.getByTestId("analytics-overview-error")).toBeTruthy(),
    );
  });

  it("P: window button click changes selected window (fetch called with new window)", async () => {
    const fetchFn = buildFetch(MOCK_OVERVIEW);
    renderPage(fetchFn);
    fireEvent.click(screen.getByTestId("window-btn-last_7d"));
    await waitFor(() => {
      const calls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls;
      const urls = calls.map((c: unknown[]) => c[0] as string);
      expect(urls.some((u) => u.includes("window=last_7d"))).toBe(true);
    });
  });

  it("Q: sub-nav link to operations page is present", () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    expect(screen.getByTestId("analytics-nav-operations")).toBeTruthy();
  });

  it("R: sub-nav link to content page is present", () => {
    renderPage(buildFetch(MOCK_OVERVIEW));
    expect(screen.getByTestId("analytics-nav-content")).toBeTruthy();
  });
});
