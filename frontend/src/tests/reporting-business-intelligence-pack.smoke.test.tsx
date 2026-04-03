import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { AnalyticsOverviewPage } from "../pages/admin/AnalyticsOverviewPage";
import { AnalyticsContentPage } from "../pages/admin/AnalyticsContentPage";
import { AnalyticsOperationsPage } from "../pages/admin/AnalyticsOperationsPage";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderAt(path: string) {
  window.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })
  ) as unknown as typeof window.fetch;

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
          { path: "analytics", element: <AnalyticsOverviewPage /> },
          { path: "analytics/content", element: <AnalyticsContentPage /> },
          { path: "analytics/operations", element: <AnalyticsOperationsPage /> },
        ],
      },
    ],
    { initialEntries: [path] }
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

/* ------------------------------------------------------------------ */
/*  Phase 314 — Reporting entry surface                                */
/* ------------------------------------------------------------------ */

describe("Phase 314 — Reporting entry surface", () => {
  it("admin overview analytics quick link has reporting context", () => {
    renderAt("/admin");
    const card = screen.getByTestId("quick-link-analytics");
    expect(card.textContent).toContain("raporlama");
    expect(card.textContent).toContain("karar destek");
  });

  it("analytics overview subtitle includes reporting context", () => {
    renderAt("/admin/analytics");
    const sub = screen.getByTestId("analytics-overview-subtitle");
    expect(sub.textContent).toContain("raporlama");
    expect(sub.textContent).toContain("karar destek");
  });

  it("analytics overview workflow note describes reporting chain", () => {
    renderAt("/admin/analytics");
    const note = screen.getByTestId("analytics-overview-workflow-note");
    expect(note.textContent).toContain("Raporlama zinciri");
    expect(note.textContent).toContain("Karar Destek Ozeti");
  });

  it("analytics overview has reporting distinction note", () => {
    renderAt("/admin/analytics");
    const note = screen.getByTestId("analytics-reporting-distinction");
    expect(note).toBeDefined();
    expect(note.textContent).toContain("Analytics canli metrikleri");
    expect(note.textContent).toContain("Raporlama");
    expect(note.textContent).toContain("karar destekleyici");
  });

  it("analytics sub-nav content card has usage summary context", () => {
    renderAt("/admin/analytics");
    const card = screen.getByTestId("analytics-nav-content");
    expect(card.textContent).toContain("Kullanim");
    expect(card.textContent).toContain("etki ozeti");
  });

  it("analytics sub-nav operations card has reporting context", () => {
    renderAt("/admin/analytics");
    const card = screen.getByTestId("analytics-nav-operations");
    expect(card.textContent).toContain("Operasyonel saglik raporu");
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 315 — Operational metrics visibility                         */
/* ------------------------------------------------------------------ */

describe("Phase 315 — Operational metrics visibility", () => {
  it("operations page subtitle includes reporting context", () => {
    renderAt("/admin/analytics/operations");
    const sub = screen.getByTestId("analytics-operations-subtitle");
    expect(sub.textContent).toContain("operasyonel saglik raporunun");
  });

  it("operations page workflow note describes report chain", () => {
    renderAt("/admin/analytics/operations");
    const note = screen.getByTestId("analytics-operations-workflow-note");
    expect(note.textContent).toContain("Operasyonel rapor zinciri");
    expect(note.textContent).toContain("Karar Noktasi");
  });

  it("operations page has job performance section", () => {
    renderAt("/admin/analytics/operations");
    expect(screen.getByTestId("analytics-job-performance")).toBeDefined();
    expect(screen.getByTestId("job-performance-heading").textContent).toBe("Is Performansi");
  });

  it("operations page has provider health section", () => {
    renderAt("/admin/analytics/operations");
    expect(screen.getByTestId("analytics-provider-health")).toBeDefined();
    expect(screen.getByTestId("provider-health-heading").textContent).toBe("Provider Sagligi");
  });

  it("operations page has source impact section", () => {
    renderAt("/admin/analytics/operations");
    expect(screen.getByTestId("analytics-source-impact")).toBeDefined();
    expect(screen.getByTestId("source-impact-heading").textContent).toBe("Kaynak Etkisi");
  });

  it("operations page has all job performance metric cards", () => {
    renderAt("/admin/analytics/operations");
    expect(screen.getByTestId("ops-metric-total-jobs")).toBeDefined();
    expect(screen.getByTestId("ops-metric-completed")).toBeDefined();
    expect(screen.getByTestId("ops-metric-failed")).toBeDefined();
    expect(screen.getByTestId("ops-metric-avg-render")).toBeDefined();
  });

  it("operations page has provider metric cards", () => {
    renderAt("/admin/analytics/operations");
    expect(screen.getByTestId("ops-metric-provider-calls")).toBeDefined();
    expect(screen.getByTestId("ops-metric-provider-errors")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 316 — Usage/performance summary                              */
/* ------------------------------------------------------------------ */

describe("Phase 316 — Usage/performance summary", () => {
  it("content page subtitle includes usage/performance summary context", () => {
    renderAt("/admin/analytics/content");
    const sub = screen.getByTestId("analytics-content-subtitle");
    expect(sub.textContent).toContain("kullanim ve performans ozetinin");
  });

  it("content page workflow note describes usage/performance report chain", () => {
    renderAt("/admin/analytics/content");
    const note = screen.getByTestId("analytics-content-workflow-note");
    expect(note.textContent).toContain("Kullanim/performans rapor zinciri");
    expect(note.textContent).toContain("Verimlilik Ozeti");
  });

  it("content page module distribution note mentions decision support", () => {
    renderAt("/admin/analytics/content");
    const note = screen.getByTestId("module-distribution-note");
    expect(note.textContent).toContain("verimlilik karari");
  });

  it("analytics overview channel overview note mentions decision support", () => {
    renderAt("/admin/analytics");
    const note = screen.getByTestId("channel-overview-note");
    expect(note.textContent).toContain("karar destek gorunumu");
  });

  it("analytics overview core metrics section is present", () => {
    renderAt("/admin/analytics");
    expect(screen.getByTestId("analytics-core-metrics")).toBeDefined();
    expect(screen.getByTestId("core-metrics-heading").textContent).toBe("Temel Metrikler");
  });

  it("analytics overview has all 6 core metric cards", () => {
    renderAt("/admin/analytics");
    expect(screen.getByTestId("metric-publish-count")).toBeDefined();
    expect(screen.getByTestId("metric-failed-publish")).toBeDefined();
    expect(screen.getByTestId("metric-job-success-rate")).toBeDefined();
    expect(screen.getByTestId("metric-avg-duration")).toBeDefined();
    expect(screen.getByTestId("metric-retry-rate")).toBeDefined();
    expect(screen.getByTestId("metric-provider-error")).toBeDefined();
  });

  it("analytics overview has channel overview cards", () => {
    renderAt("/admin/analytics");
    expect(screen.getByTestId("metric-total-content")).toBeDefined();
    expect(screen.getByTestId("metric-active-modules")).toBeDefined();
    expect(screen.getByTestId("metric-template-impact")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 317 — End-to-end verification                                */
/* ------------------------------------------------------------------ */

describe("Phase 317 — Reporting end-to-end verification", () => {
  it("admin overview → analytics link exists with reporting context", () => {
    renderAt("/admin");
    const card = screen.getByTestId("quick-link-analytics");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Analytics");
  });

  it("analytics overview chain: heading + subtitle + workflow + distinction all present", () => {
    renderAt("/admin/analytics");
    expect(screen.getByTestId("analytics-overview-heading")).toBeDefined();
    expect(screen.getByTestId("analytics-overview-subtitle")).toBeDefined();
    expect(screen.getByTestId("analytics-overview-workflow-note")).toBeDefined();
    expect(screen.getByTestId("analytics-reporting-distinction")).toBeDefined();
  });

  it("operations page chain: heading + subtitle + workflow + sections all present", () => {
    renderAt("/admin/analytics/operations");
    expect(screen.getByTestId("analytics-operations-heading")).toBeDefined();
    expect(screen.getByTestId("analytics-operations-subtitle")).toBeDefined();
    expect(screen.getByTestId("analytics-operations-workflow-note")).toBeDefined();
    expect(screen.getByTestId("analytics-job-performance")).toBeDefined();
    expect(screen.getByTestId("analytics-provider-health")).toBeDefined();
    expect(screen.getByTestId("analytics-source-impact")).toBeDefined();
  });

  it("content page chain: heading + subtitle + workflow + sections all present", () => {
    renderAt("/admin/analytics/content");
    expect(screen.getByTestId("analytics-content-heading")).toBeDefined();
    expect(screen.getByTestId("analytics-content-subtitle")).toBeDefined();
    expect(screen.getByTestId("analytics-content-workflow-note")).toBeDefined();
    expect(screen.getByTestId("analytics-video-performance")).toBeDefined();
    expect(screen.getByTestId("analytics-module-distribution")).toBeDefined();
  });

  it("analytics/reporting distinction clearly separates live vs summary", () => {
    renderAt("/admin/analytics");
    const note = screen.getByTestId("analytics-reporting-distinction");
    expect(note.textContent).toContain("canli metrikleri");
    expect(note.textContent).toContain("ozetleyici");
  });
});
