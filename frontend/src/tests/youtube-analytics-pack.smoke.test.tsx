import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { AnalyticsOverviewPage } from "../pages/admin/AnalyticsOverviewPage";
import { AnalyticsContentPage } from "../pages/admin/AnalyticsContentPage";
import { AnalyticsOperationsPage } from "../pages/admin/AnalyticsOperationsPage";

function mockFetch(handler: (url: string) => unknown) {
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(handler(url)),
    })
  ) as unknown as typeof window.fetch;
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
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
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("YouTube Analytics Pack (Phase 293-298)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch(() => []);
  });

  /* ---- Phase 293: Analytics entry surface ---- */

  describe("Phase 293: analytics entry surface", () => {
    it("admin overview shows analytics quick link", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-analytics");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("performans metriklerini takip et");
    });

    it("sidebar has analytics entry", () => {
      renderAt("/admin/analytics");
      expect(screen.getAllByText("Analytics").length).toBeGreaterThanOrEqual(1);
    });

    it("analytics overview shows heading with testid", () => {
      renderAt("/admin/analytics");
      const heading = screen.getByTestId("analytics-overview-heading");
      expect(heading).toBeDefined();
      expect(heading.textContent).toContain("Analytics");
    });

    it("analytics overview shows subtitle", () => {
      renderAt("/admin/analytics");
      const sub = screen.getByTestId("analytics-overview-subtitle");
      expect(sub.textContent).toContain("performans gorunurlugu");
    });

    it("analytics overview shows workflow note", () => {
      renderAt("/admin/analytics");
      const note = screen.getByTestId("analytics-overview-workflow-note");
      expect(note.textContent).toContain("Uretim Tamamlama");
      expect(note.textContent).toContain("Icerik Performansi");
    });
  });

  /* ---- Phase 294: Core metrics dashboard ---- */

  describe("Phase 294: core metrics dashboard", () => {
    it("core metrics section is present", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("analytics-core-metrics")).toBeDefined();
    });

    it("core metrics heading and note exist", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("core-metrics-heading").textContent).toContain("Temel Metrikler");
      expect(screen.getByTestId("core-metrics-note").textContent).toContain("ozet gostergesi");
    });

    it("shows publish count metric card", () => {
      renderAt("/admin/analytics");
      const card = screen.getByTestId("metric-publish-count");
      expect(card.textContent).toContain("Yayin Sayisi");
    });

    it("shows failed publish metric card", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("metric-failed-publish").textContent).toContain("Basarisiz Yayin");
    });

    it("shows job success rate metric card", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("metric-job-success-rate").textContent).toContain("Basari Orani");
    });

    it("shows avg duration metric card", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("metric-avg-duration").textContent).toContain("Uretim Suresi");
    });

    it("shows retry rate metric card", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("metric-retry-rate").textContent).toContain("Yeniden Deneme");
    });

    it("shows provider error metric card", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("metric-provider-error").textContent).toContain("Provider Hata");
    });
  });

  /* ---- Phase 295: Video-level performance view ---- */

  describe("Phase 295: video-level performance view", () => {
    it("content analytics page shows heading", () => {
      renderAt("/admin/analytics/content");
      expect(screen.getByTestId("analytics-content-heading").textContent).toContain("Icerik Performansi");
    });

    it("content analytics page shows subtitle", () => {
      renderAt("/admin/analytics/content");
      expect(screen.getByTestId("analytics-content-subtitle").textContent).toContain("Video bazinda");
    });

    it("content analytics shows workflow note with video detail reference", () => {
      renderAt("/admin/analytics/content");
      const note = screen.getByTestId("analytics-content-workflow-note");
      expect(note.textContent).toContain("standard video detay sayfasina");
    });

    it("video performance section exists", () => {
      renderAt("/admin/analytics/content");
      expect(screen.getByTestId("analytics-video-performance")).toBeDefined();
      expect(screen.getByTestId("video-performance-heading").textContent).toContain("Video Performans");
    });

    it("video performance table shows empty state", () => {
      renderAt("/admin/analytics/content");
      expect(screen.getByTestId("video-performance-empty")).toBeDefined();
    });

    it("module distribution section exists", () => {
      renderAt("/admin/analytics/content");
      expect(screen.getByTestId("analytics-module-distribution")).toBeDefined();
      expect(screen.getByTestId("module-distribution-heading").textContent).toContain("Modul Dagilimi");
    });

    it("analytics overview has content nav link", () => {
      renderAt("/admin/analytics");
      const link = screen.getByTestId("analytics-nav-content");
      expect(link.textContent).toContain("Icerik Performansi");
    });
  });

  /* ---- Phase 296: Channel overview clarity ---- */

  describe("Phase 296: channel overview clarity", () => {
    it("channel overview section exists on analytics overview", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("analytics-channel-overview")).toBeDefined();
    });

    it("channel overview heading and note exist", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("channel-overview-heading").textContent).toContain("Kanal Ozeti");
      expect(screen.getByTestId("channel-overview-note").textContent).toContain("kanal duzeyinde");
    });

    it("channel overview differentiates from video-level", () => {
      renderAt("/admin/analytics");
      const note = screen.getByTestId("channel-overview-note");
      expect(note.textContent).toContain("Tek video performansindan farkli");
    });

    it("channel metrics cards exist", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("metric-total-content")).toBeDefined();
      expect(screen.getByTestId("metric-active-modules")).toBeDefined();
      expect(screen.getByTestId("metric-template-impact")).toBeDefined();
    });
  });

  /* ---- Phase 297: Date/filter interaction ---- */

  describe("Phase 297: date/filter interaction", () => {
    it("filter area exists on analytics overview", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("analytics-filter-area")).toBeDefined();
    });

    it("filter heading and note exist", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("filter-heading").textContent).toContain("Filtre");
      expect(screen.getByTestId("filter-note").textContent).toContain("tarih araligi");
    });

    it("date start filter input exists", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("filter-date-start")).toBeDefined();
    });

    it("date end filter input exists", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("filter-date-end")).toBeDefined();
    });

    it("module select filter exists", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("filter-module-select")).toBeDefined();
    });

    it("filter disabled note is shown", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("filter-disabled-note").textContent).toContain("backend aktif olunca");
    });
  });

  /* ---- Phase 298: End-to-end verification ---- */

  describe("Phase 298: analytics verification", () => {
    it("operations analytics page shows heading", () => {
      renderAt("/admin/analytics/operations");
      expect(screen.getByTestId("analytics-operations-heading").textContent).toContain("Operasyon");
    });

    it("operations page shows job performance section", () => {
      renderAt("/admin/analytics/operations");
      expect(screen.getByTestId("analytics-job-performance")).toBeDefined();
      expect(screen.getByTestId("job-performance-heading").textContent).toContain("Is Performansi");
    });

    it("operations page shows provider health section", () => {
      renderAt("/admin/analytics/operations");
      expect(screen.getByTestId("analytics-provider-health")).toBeDefined();
      expect(screen.getByTestId("provider-health-heading").textContent).toContain("Provider Sagligi");
    });

    it("operations page shows source impact section", () => {
      renderAt("/admin/analytics/operations");
      expect(screen.getByTestId("analytics-source-impact")).toBeDefined();
      expect(screen.getByTestId("source-impact-heading").textContent).toContain("Kaynak Etkisi");
    });

    it("analytics overview has operations nav link", () => {
      renderAt("/admin/analytics");
      const link = screen.getByTestId("analytics-nav-operations");
      expect(link.textContent).toContain("Operasyon Metrikleri");
    });

    it("analytics sub-nav section exists", () => {
      renderAt("/admin/analytics");
      expect(screen.getByTestId("analytics-sub-nav")).toBeDefined();
      expect(screen.getByTestId("analytics-sub-nav-heading").textContent).toContain("Analytics Alanlari");
    });

    it("back link from content page works", () => {
      renderAt("/admin/analytics/content");
      expect(screen.getByText("← Analytics'e don")).toBeDefined();
    });

    it("back link from operations page works", () => {
      renderAt("/admin/analytics/operations");
      expect(screen.getByText("← Analytics'e don")).toBeDefined();
    });
  });
});
