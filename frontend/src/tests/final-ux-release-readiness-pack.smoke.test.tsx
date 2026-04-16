import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { UserPublishEntryPage } from "../pages/UserPublishEntryPage";
import { ContentLibraryPage } from "../pages/admin/ContentLibraryPage";
import { JobsRegistryPage } from "../pages/admin/JobsRegistryPage";
import { JobDetailPage } from "../pages/admin/JobDetailPage";
import { AnalyticsOverviewPage } from "../pages/admin/AnalyticsOverviewPage";
import { AnalyticsContentPage } from "../pages/admin/AnalyticsContentPage";
import { AnalyticsOperationsPage } from "../pages/admin/AnalyticsOperationsPage";
import { StandardVideoDetailPage } from "../pages/admin/StandardVideoDetailPage";

// ------------------------------------------------------------------
//  NOT: Bu dosya deprecated testid'ler (release-readiness-*,
//  admin-overview-workflow-note, analytics-filter-area,
//  content-window-selector, dashboard-context-note) icin yazilmis
//  eski bir kontrati tasiyordu. UI'dan kaldirilan alanlar bu
//  surumden itibaren test sozlesmesinden de cikarildi. Kalan testler
//  guncel UI ile hizalandi.
// ------------------------------------------------------------------

const MOCK_JOB = {
  id: "test-123",
  module: "standard_video",
  status: "completed",
  current_step: "render",
  retry_count: 0,
  owner: "admin",
  template_id: null,
  workspace_path: null,
  elapsed_total: 120,
  eta_remaining: null,
  last_error: null,
  created_at: "2026-01-01T00:00:00Z",
  started_at: "2026-01-01T00:01:00Z",
  completed_at: "2026-01-01T00:03:00Z",
  steps: [],
};

const MOCK_SV = {
  id: "test-456",
  title: "Test Video",
  status: "draft",
  created_at: "2026-01-01T00:00:00Z",
};

const MOCK_CONTENT_METRICS = {
  window: "all_time",
  module_distribution: [],
  content_output_count: 0,
  published_content_count: 0,
  avg_time_to_publish_seconds: null,
  content_type_breakdown: [
    { type: "standard_video", count: 0 },
    { type: "news_bulletin", count: 0 },
  ],
  active_template_count: 0,
  active_blueprint_count: 0,
};

function mockFetchByUrl() {
  window.fetch = vi.fn((url: string) => {
    let data: unknown = [];
    if (url.includes("/analytics/content")) data = MOCK_CONTENT_METRICS;
    else if (url.includes("/jobs/test-123")) data = MOCK_JOB;
    else if (url.includes("/standard-videos/test-456")) data = MOCK_SV;
    else if (url.includes("/onboarding")) data = { onboarding_required: false, completed_at: "2026-01-01" };
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });
  }) as unknown as typeof window.fetch;
}

function renderAdmin(path: string) {
  mockFetchByUrl();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "library", element: <ContentLibraryPage /> },
          { path: "jobs", element: <JobsRegistryPage /> },
          { path: "jobs/:jobId", element: <JobDetailPage /> },
          { path: "analytics", element: <AnalyticsOverviewPage /> },
          { path: "analytics/content", element: <AnalyticsContentPage /> },
          { path: "analytics/operations", element: <AnalyticsOperationsPage /> },
          { path: "standard-videos/:itemId", element: <StandardVideoDetailPage /> },
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

function renderUser(path: string) {
  mockFetchByUrl();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/user",
        element: <UserLayout />,
        children: [
          { index: true, element: <UserDashboardPage /> },
          { path: "content", element: <UserContentEntryPage /> },
          { path: "publish", element: <UserPublishEntryPage /> },
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

beforeEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/*  Phase 318 — Deferred/disabled note standardization                 */
/* ------------------------------------------------------------------ */

describe("Phase 318 — Deferred/disabled note standardization", () => {
  it("library filter inputs are active (M18-C)", () => {
    renderAdmin("/admin/library");
    const active = screen.getByTestId("library-filters-active");
    expect(active).toBeDefined();
    expect(screen.getByTestId("library-search-input")).toBeDefined();
  });

  it("analytics overview filter bar renders (M17-B)", () => {
    renderAdmin("/admin/analytics");
    // Guncel UI'da 'analytics-filter-area' wrapper'i yok; filter bar
    // 'filter-date-start' inputu ile dogrulanir.
    expect(screen.getByTestId("filter-date-start")).toBeDefined();
  });

  it("analytics content module distribution section exists (M18-B)", async () => {
    renderAdmin("/admin/analytics/content");
    await waitFor(() => {
      expect(screen.getByTestId("analytics-module-distribution")).toBeDefined();
    });
    expect(screen.getByTestId("module-distribution-heading").textContent).toContain("Modul Dagilimi");
  });

  it("analytics operations source impact shows real metrics (M17-A)", () => {
    renderAdmin("/admin/analytics/operations");
    const section = screen.getByTestId("analytics-source-impact");
    expect(section).toBeDefined();
    expect(screen.getByTestId("source-impact-heading").textContent).toContain("Kaynak Etkisi");
  });

  it("job detail actions panel shows operational actions", async () => {
    renderAdmin("/admin/jobs/test-123");
    const panel = await waitFor(() => screen.getByTestId("job-actions-panel"));
    expect(panel.textContent).toContain("Operasyonel Aksiyonlar");
    expect(panel.textContent).not.toContain("ilerideki fazlarda");
  });

  it("standard video detail manage note uses standard wording", async () => {
    renderAdmin("/admin/standard-videos/test-456");
    const note = await waitFor(() => screen.getByTestId("sv-detail-manage-note"));
    expect(note.textContent).toContain("Kaydi duzenleyin");
    expect(note.textContent).not.toContain("ilerideki fazlarda");
  });

  it("library empty state is present when no items", async () => {
    renderAdmin("/admin/library");
    const empty = await waitFor(() => screen.getByTestId("library-empty-state"));
    expect(empty.textContent).toContain("Henüz icerik kaydi bulunmuyor");
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 319 — Cross-module UX coherence                              */
/* ------------------------------------------------------------------ */

describe("Phase 319 — Cross-module UX coherence", () => {
  describe("Admin panel heading + subtitle", () => {
    it("admin overview has heading (PageShell auto testid)", () => {
      renderAdmin("/admin");
      const h = screen.getByTestId("admin-overview-heading");
      // F48: short-form "Yönetim Paneli"
      expect(h.textContent).toBe("Yönetim Paneli");
    });

    it("admin overview has subtitle (PageShell auto testid)", () => {
      renderAdmin("/admin");
      expect(screen.getByTestId("admin-overview-subtitle")).toBeDefined();
    });
  });

  describe("User panel heading testids", () => {
    it("dashboard has greeting heading (PageShell auto testid)", () => {
      renderUser("/user");
      const h = screen.getByTestId("dashboard-heading");
      expect(h.textContent).toMatch(/Hoşgeldin/);
    });

    it("content page has heading", () => {
      renderUser("/user/content");
      const h = screen.getByTestId("content-heading");
      expect(h.textContent).toBe("İçerik");
    });

    it("publish page has heading", () => {
      renderUser("/user/publish");
      const h = screen.getByTestId("publish-heading");
      expect(h.textContent).toBe("Yayin");
    });

    it("content page has subtitle", () => {
      renderUser("/user/content");
      expect(screen.getByTestId("content-section-subtitle")).toBeDefined();
    });

    it("publish page has subtitle", () => {
      renderUser("/user/publish");
      expect(screen.getByTestId("publish-section-subtitle")).toBeDefined();
    });

    it("publish page has workflow chain", () => {
      renderUser("/user/publish");
      const chain = screen.getByTestId("publish-workflow-chain");
      expect(chain.textContent).toContain("YouTube Yayini");
    });
  });

  describe("First-use notes present", () => {
    it("content page has first-use note (Turkish copy)", () => {
      renderUser("/user/content");
      const note = screen.getByTestId("content-first-use-note");
      expect(note.textContent).toContain("İlk kez mi kullanıyorsunuz");
    });

    it("publish page has first-use note (ASCII copy)", () => {
      renderUser("/user/publish");
      const note = screen.getByTestId("publish-first-use-note");
      expect(note.textContent).toContain("Yayin sureci baslamadiysa");
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 321 — End-to-end verification                                */
/*  (Phase 320 release-readiness-* testid'leri UI'dan kaldirildi —     */
/*   ilgili blok silindi.)                                              */
/* ------------------------------------------------------------------ */

describe("Phase 321 — Final UX end-to-end verification", () => {
  it("admin overview chain: heading + subtitle + quick access", () => {
    renderAdmin("/admin");
    expect(screen.getByTestId("admin-overview-heading")).toBeDefined();
    expect(screen.getByTestId("admin-overview-subtitle")).toBeDefined();
    expect(screen.getByTestId("admin-quick-access-heading")).toBeDefined();
  });

  it("user dashboard has greeting heading", () => {
    renderUser("/user");
    expect(screen.getByTestId("dashboard-heading")).toBeDefined();
  });

  it("user content chain: heading + subtitle + first-use note + crosslink", () => {
    renderUser("/user/content");
    expect(screen.getByTestId("content-heading")).toBeDefined();
    expect(screen.getByTestId("content-section-subtitle")).toBeDefined();
    expect(screen.getByTestId("content-first-use-note")).toBeDefined();
    expect(screen.getByTestId("content-crosslink-area")).toBeDefined();
  });

  it("user publish chain: heading + subtitle + workflow + first-use note + crosslink", () => {
    renderUser("/user/publish");
    expect(screen.getByTestId("publish-heading")).toBeDefined();
    expect(screen.getByTestId("publish-section-subtitle")).toBeDefined();
    expect(screen.getByTestId("publish-workflow-chain")).toBeDefined();
    expect(screen.getByTestId("publish-first-use-note")).toBeDefined();
    expect(screen.getByTestId("publish-crosslink-area")).toBeDefined();
  });

  it("no remaining 'backend aktif olunca' text in analytics pages", () => {
    renderAdmin("/admin/analytics");
    const page = document.body.textContent || "";
    expect(page).not.toContain("backend aktif olunca");
  });

  it("no remaining 'ilerideki fazlarda' text in admin overview", () => {
    renderAdmin("/admin");
    const page = document.body.textContent || "";
    expect(page).not.toContain("ilerideki fazlarda");
  });

  it("analytics overview filter input is present (M17-B)", () => {
    renderAdmin("/admin/analytics");
    expect(screen.getByTestId("filter-date-start")).toBeDefined();
  });
});
