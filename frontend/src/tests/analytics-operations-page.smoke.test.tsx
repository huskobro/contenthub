import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsOperationsPage } from "../pages/admin/AnalyticsOperationsPage";
import type { OperationsMetrics, OverviewMetrics, SourceImpactMetrics } from "../api/analyticsApi";

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

const MOCK_SOURCE_IMPACT: SourceImpactMetrics = {
  window: "last_30d",
  total_sources: 3,
  active_sources: 2,
  total_scans: 10,
  successful_scans: 8,
  total_news_items: 25,
  used_news_count: 5,
  bulletin_count: 2,
  source_stats: [
    {
      source_id: "src-1",
      source_name: "Test RSS",
      source_type: "rss",
      status: "active",
      scan_count: 5,
      news_count: 10,
      used_news_count: 3,
    },
  ],
};

const MOCK_OPERATIONS_EMPTY: OperationsMetrics = {
  window: "last_7d",
  avg_render_duration_seconds: null,
  step_stats: [],
  provider_error_rate: null,
  provider_stats: [],
};

const MOCK_SOURCE_EMPTY: SourceImpactMetrics = {
  window: "last_7d",
  total_sources: 0,
  active_sources: 0,
  total_scans: 0,
  successful_scans: 0,
  total_news_items: 0,
  used_news_count: 0,
  bulletin_count: 0,
  source_stats: [],
};

function buildFetch(ops: OperationsMetrics, srcImpact?: SourceImpactMetrics) {
  return vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("/source-impact")) {
      return { ok: true, json: async () => srcImpact ?? MOCK_SOURCE_EMPTY };
    }
    if (url.includes("/overview")) {
      return { ok: true, json: async () => MOCK_OVERVIEW };
    }
    return { ok: true, json: async () => ops };
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

  it("F: shows dash for null avg_render_duration (empty data)", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS_EMPTY));
    await waitFor(() =>
      expect(screen.getByTestId("ops-metric-avg-render-value").textContent).toBe("\u2014"),
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

  it("N: provider_error_rate shown as dash (null)", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS));
    await waitFor(() =>
      expect(screen.getByTestId("ops-metric-provider-error-value").textContent).toBe("\u2014"),
    );
  });

  // M17-A source impact tests
  it("O: renders source impact section", () => {
    renderPage(buildFetch(MOCK_OPERATIONS, MOCK_SOURCE_IMPACT));
    expect(screen.getByTestId("analytics-source-impact")).toBeTruthy();
  });

  it("P: shows source impact metrics from real data", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS, MOCK_SOURCE_IMPACT));
    await waitFor(() => {
      expect(screen.getByTestId("source-metric-total-value").textContent).toBe("3");
      expect(screen.getByTestId("source-metric-active-value").textContent).toBe("2");
      expect(screen.getByTestId("source-metric-scans-value").textContent).toBe("10");
      expect(screen.getByTestId("source-metric-news-value").textContent).toBe("25");
    });
  });

  it("Q: shows source stats table", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS, MOCK_SOURCE_IMPACT));
    await waitFor(() =>
      expect(screen.getByTestId("source-stats-table")).toBeTruthy(),
    );
  });

  it("R: shows empty state for source stats", async () => {
    renderPage(buildFetch(MOCK_OPERATIONS, MOCK_SOURCE_EMPTY));
    await waitFor(() =>
      expect(screen.getByTestId("source-stats-empty")).toBeTruthy(),
    );
  });

  // M17-D cost model tests
  it("S: cost model legend shown with provider stats", async () => {
    const opsWithProviders: OperationsMetrics = {
      ...MOCK_OPERATIONS,
      provider_stats: [
        {
          provider_name: "openai",
          provider_kind: "llm",
          total_calls: 10,
          failed_calls: 1,
          error_rate: 0.1,
          avg_latency_ms: 2500,
          total_estimated_cost_usd: 0.0123,
          total_input_tokens: 5000,
          total_output_tokens: 2000,
        },
      ],
    };
    renderPage(buildFetch(opsWithProviders));
    await waitFor(() => {
      expect(screen.getByTestId("cost-model-legend")).toBeTruthy();
      expect(screen.getByTestId("provider-cost-badge-openai").textContent).toBe("actual");
    });
  });
});
