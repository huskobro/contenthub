import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsOverviewPage } from "../pages/admin/AnalyticsOverviewPage";
import type { OverviewMetrics, ChannelOverviewMetrics } from "../api/analyticsApi";

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
  review_pending_count: 0,
  review_rejected_count: 0,
  publish_backlog_count: 0,
};

const MOCK_CHANNEL: ChannelOverviewMetrics = {
  window: "last_30d",
  youtube: {
    total_publish_attempts: 15,
    published_count: 12,
    failed_count: 2,
    draft_count: 1,
    in_progress_count: 0,
    publish_success_rate: 0.8,
    last_published_at: "2026-03-28T14:00:00",
    has_publish_history: true,
  },
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
  review_pending_count: 0,
  review_rejected_count: 0,
  publish_backlog_count: 0,
};

const MOCK_CHANNEL_EMPTY: ChannelOverviewMetrics = {
  window: "last_7d",
  youtube: {
    total_publish_attempts: 0,
    published_count: 0,
    failed_count: 0,
    draft_count: 0,
    in_progress_count: 0,
    publish_success_rate: null,
    last_published_at: null,
    has_publish_history: false,
  },
};

function buildFetch(overview: OverviewMetrics, channel: ChannelOverviewMetrics) {
  return vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("/channel")) {
      return { ok: true, json: async () => channel };
    }
    return { ok: true, json: async () => overview };
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
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    expect(screen.getByTestId("analytics-overview-heading")).toBeTruthy();
  });

  it("B: renders window selector buttons", () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    expect(screen.getByTestId("window-btn-last_7d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-last_30d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-last_90d")).toBeTruthy();
    expect(screen.getByTestId("window-btn-all_time")).toBeTruthy();
  });

  it("C: renders core metrics section", () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    expect(screen.getByTestId("analytics-core-metrics")).toBeTruthy();
  });

  it("D: renders publish metrics section", () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    expect(screen.getByTestId("analytics-publish-metrics")).toBeTruthy();
  });

  it("E: shows real total_job_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-total-jobs-value").textContent).toBe("42"),
    );
  });

  it("F: shows real completed_job_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-completed-jobs-value").textContent).toBe("38"),
    );
  });

  it("G: shows real failed_job_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-failed-jobs-value").textContent).toBe("4"),
    );
  });

  it("H: shows job_success_rate as percentage", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-job-success-rate-value").textContent).toBe("90.5%"),
    );
  });

  it("I: shows avg_production_duration_seconds formatted", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-avg-duration-value").textContent).toBe("2.1dk"),
    );
  });

  it("J: shows retry_rate as percentage", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-retry-rate-value").textContent).toBe("7.1%"),
    );
  });

  it("K: shows published_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-publish-count-value").textContent).toBe("28"),
    );
  });

  it("L: shows failed_publish_count after load", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-failed-publish-value").textContent).toBe("2"),
    );
  });

  it("M: shows publish_success_rate as percentage", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-publish-success-rate-value").textContent).toBe("93.3%"),
    );
  });

  it("N: shows dash for null metrics (empty data)", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW_EMPTY, MOCK_CHANNEL_EMPTY));
    await waitFor(() =>
      expect(screen.getByTestId("metric-job-success-rate-value").textContent).toBe("\u2014"),
    );
    expect(screen.getByTestId("metric-avg-duration-value").textContent).toBe("\u2014");
    expect(screen.getByTestId("metric-retry-rate-value").textContent).toBe("\u2014");
  });

  it("O: shows error state on fetch failure", async () => {
    const failFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    renderPage(failFetch as typeof window.fetch);
    await waitFor(() =>
      expect(screen.getByTestId("analytics-overview-error")).toBeTruthy(),
    );
  });

  it("P: window button click changes selected window (fetch called with new window)", async () => {
    const fetchFn = buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL);
    renderPage(fetchFn);
    fireEvent.click(screen.getByTestId("window-btn-last_7d"));
    await waitFor(() => {
      const calls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls;
      const urls = calls.map((c: unknown[]) => c[0] as string);
      expect(urls.some((u) => u.includes("window=last_7d"))).toBe(true);
    });
  });

  it("Q: sub-nav link to operations page is present", () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    expect(screen.getByTestId("analytics-nav-operations")).toBeTruthy();
  });

  it("R: sub-nav link to content page is present", () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    expect(screen.getByTestId("analytics-nav-content")).toBeTruthy();
  });

  // M17 channel overview tests
  it("S: renders channel overview section", () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    expect(screen.getByTestId("analytics-channel-overview")).toBeTruthy();
  });

  it("T: shows YouTube publish count from real data", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-yt-total-publish-value").textContent).toBe("15"),
    );
  });

  it("U: shows YouTube published count", async () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    await waitFor(() =>
      expect(screen.getByTestId("metric-yt-published-value").textContent).toBe("12"),
    );
  });

  // M17-B date range filter tests
  it("V: date range inputs are enabled (not disabled)", () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    const startInput = screen.getByTestId("filter-date-start") as HTMLInputElement;
    const endInput = screen.getByTestId("filter-date-end") as HTMLInputElement;
    expect(startInput.disabled).toBe(false);
    expect(endInput.disabled).toBe(false);
  });

  it("W: filter area is shown when no date range", () => {
    renderPage(buildFetch(MOCK_OVERVIEW, MOCK_CHANNEL));
    expect(screen.getByTestId("analytics-filter-area")).toBeTruthy();
  });
});
