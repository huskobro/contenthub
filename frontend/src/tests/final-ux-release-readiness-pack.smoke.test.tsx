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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
/*  Phase 318 — Global empty/error state standardization               */
/* ------------------------------------------------------------------ */

describe("Phase 318 — Deferred/disabled note standardization", () => {
  it("library filter inputs are active (M18-C)", () => {
    renderAdmin("/admin/library");
    const active = screen.getByTestId("library-filters-active");
    expect(active).toBeDefined();
    expect(screen.getByTestId("library-search-input")).toBeDefined();
  });

  it("analytics overview filter section is active (M17-B)", () => {
    renderAdmin("/admin/analytics");
    const note = screen.getByTestId("filter-inactive-note");
    expect(note.textContent).toContain("zaman penceresi");
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
    expect(note.textContent).toContain("backend entegrasyonu");
    expect(note.textContent).not.toContain("ilerideki fazlarda");
  });

  it("analytics content window selector is present (M18-B)", () => {
    renderAdmin("/admin/analytics/content");
    expect(screen.getByTestId("content-window-selector")).toBeDefined();
  });

  it("library empty state is present when no items", async () => {
    renderAdmin("/admin/library");
    const empty = await waitFor(() => screen.getByTestId("library-empty-state"));
    expect(empty.textContent).toContain("Henuz icerik kaydi bulunmuyor");
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 319 — Cross-module UX coherence                              */
/* ------------------------------------------------------------------ */

describe("Phase 319 — Cross-module UX coherence", () => {
  describe("Admin panel heading + subtitle + workflow pattern", () => {
    it("admin overview has heading with testid", () => {
      renderAdmin("/admin");
      const h = screen.getByTestId("admin-overview-heading");
      expect(h.textContent).toBe("Genel Bakis");
    });

    it("admin overview has subtitle with testid", () => {
      renderAdmin("/admin");
      expect(screen.getByTestId("admin-overview-subtitle")).toBeDefined();
    });

    it("admin overview has workflow note with testid", () => {
      renderAdmin("/admin");
      const note = screen.getByTestId("admin-overview-workflow-note");
      expect(note.textContent).toContain("Yonetim zinciri");
    });
  });

  describe("User panel heading testids", () => {
    it("dashboard has heading with testid", () => {
      renderUser("/user");
      const h = screen.getByTestId("dashboard-heading");
      expect(h.textContent).toBe("Anasayfa");
    });

    it("content page has heading with testid", () => {
      renderUser("/user/content");
      const h = screen.getByTestId("content-heading");
      expect(h.textContent).toBe("Icerik");
    });

    it("publish page has heading with testid", () => {
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
      expect(chain.textContent).toContain("Yayin zinciri");
    });
  });

  describe("First-use notes present", () => {
    it("content page has first-use note", () => {
      renderUser("/user/content");
      const note = screen.getByTestId("content-first-use-note");
      expect(note.textContent).toContain("Henuz icerik olusturmadiyseniz");
    });

    it("publish page has first-use note", () => {
      renderUser("/user/publish");
      const note = screen.getByTestId("publish-first-use-note");
      expect(note.textContent).toContain("Henuz yayin sureci baslamadiysa");
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 320 — Release readiness checklist                            */
/* ------------------------------------------------------------------ */

describe("Phase 320 — Release readiness checklist", () => {
  it("admin overview has release readiness section", () => {
    renderAdmin("/admin");
    expect(screen.getByTestId("release-readiness-section")).toBeDefined();
  });

  it("release readiness heading is correct", () => {
    renderAdmin("/admin");
    const h = screen.getByTestId("release-readiness-heading");
    expect(h.textContent).toBe("Urun Hazirlik Durumu");
  });

  it("release readiness note describes backbone status", () => {
    renderAdmin("/admin");
    const note = screen.getByTestId("release-readiness-note");
    expect(note.textContent).toContain("Ana urun alanlarinin mevcut durumu");
  });

  it("has all 8 readiness items", () => {
    renderAdmin("/admin");
    expect(screen.getByTestId("readiness-content")).toBeDefined();
    expect(screen.getByTestId("readiness-publish")).toBeDefined();
    expect(screen.getByTestId("readiness-jobs")).toBeDefined();
    expect(screen.getByTestId("readiness-templates")).toBeDefined();
    expect(screen.getByTestId("readiness-news")).toBeDefined();
    expect(screen.getByTestId("readiness-settings")).toBeDefined();
    expect(screen.getByTestId("readiness-analytics")).toBeDefined();
    expect(screen.getByTestId("readiness-library")).toBeDefined();
  });

  it("readiness items show correct status labels after M18", () => {
    renderAdmin("/admin");
    // Items still at Omurga hazir
    const omurgaIds = ["readiness-content", "readiness-jobs"];
    omurgaIds.forEach((id) => {
      expect(screen.getByTestId(id).textContent).toContain("Omurga hazir");
    });
    // Items at M11 aktif
    const m11Ids = ["readiness-publish", "readiness-news"];
    m11Ids.forEach((id) => {
      expect(screen.getByTestId(id).textContent).toContain("M11 aktif");
    });
    // Items upgraded to M12 aktif
    const m12Ids = ["readiness-templates", "readiness-settings"];
    m12Ids.forEach((id) => {
      expect(screen.getByTestId(id).textContent).toContain("M12 aktif");
    });
    // Items at M18 aktif
    expect(screen.getByTestId("readiness-analytics").textContent).toContain("M18 aktif");
    // Items upgraded to M19 aktif
    const m19Ids = ["readiness-library", "readiness-assets"];
    m19Ids.forEach((id) => {
      expect(screen.getByTestId(id).textContent).toContain("M19 aktif");
    });
  });

  it("readiness-assets has M19 aktif status", () => {
    renderAdmin("/admin");
    const item = screen.getByTestId("readiness-assets");
    expect(item.textContent).toContain("M19 aktif");
  });

  it("deferred note mentions backend entegrasyonu", () => {
    renderAdmin("/admin");
    const note = screen.getByTestId("release-readiness-deferred-note");
    expect(note.textContent).toContain("backend entegrasyonu");
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 321 — End-to-end verification                                */
/* ------------------------------------------------------------------ */

describe("Phase 321 — Final UX end-to-end verification", () => {
  it("admin overview chain: heading + subtitle + workflow + quick access + readiness", () => {
    renderAdmin("/admin");
    expect(screen.getByTestId("admin-overview-heading")).toBeDefined();
    expect(screen.getByTestId("admin-overview-subtitle")).toBeDefined();
    expect(screen.getByTestId("admin-overview-workflow-note")).toBeDefined();
    expect(screen.getByTestId("admin-quick-access-heading")).toBeDefined();
    expect(screen.getByTestId("release-readiness-section")).toBeDefined();
  });

  it("user dashboard chain: heading + context note", async () => {
    renderUser("/user");
    expect(screen.getByTestId("dashboard-heading")).toBeDefined();
    await waitFor(() => expect(screen.getByTestId("dashboard-context-note")).toBeDefined());
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

  it("analytics overview filter section is present (M17-B)", () => {
    renderAdmin("/admin/analytics");
    expect(screen.getByTestId("analytics-filter-area")).toBeDefined();
  });
});
