import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { NewsBulletinCreatePage } from "../pages/admin/NewsBulletinCreatePage";
import { NewsBulletinRegistryPage } from "../pages/admin/NewsBulletinRegistryPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";

/* ---- mock data ---- */

const MOCK_BULLETIN = {
  id: "nb-001",
  title: "Test Bulletin",
  topic: "Test Topic",
  brief: "Brief",
  target_duration_seconds: 90,
  language: "tr",
  tone: "neutral",
  bulletin_style: "standard",
  source_mode: "curated",
  selected_news_ids_json: null,
  status: "draft",
  job_id: null,
  created_at: "2026-04-03T10:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
  has_script: false,
  has_metadata: false,
  selected_news_count: 0,
};

const MOCK_SELECTED_ITEM = {
  id: "sel-001",
  bulletin_id: "nb-001",
  news_item_id: "ni-001",
  sort_order: 1,
  selection_reason: "Related to topic",
  used_news_warning: false,
  used_news_count: 0,
  last_usage_type: null,
  last_target_module: null,
  created_at: "2026-04-03T10:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
};

const MOCK_NEWS_ITEM = {
  id: "ni-001",
  title: "Test News Item",
  url: "https://example.com/news",
  status: "active",
  source_id: "src-001",
  source_scan_id: null,
  summary: "A test news summary",
  published_at: "2026-04-03T09:00:00Z",
  language: "tr",
  category: "tech",
  dedupe_key: null,
  usage_count: 0,
  last_usage_type: null,
  last_target_module: null,
  source_name: "Test Source",
  source_status: "active",
  created_at: "2026-04-03T08:00:00Z",
  updated_at: "2026-04-03T08:00:00Z",
};

function mockFetch(handler: (url: string) => unknown) {
  // URL-routed safe defaults first; falls back to the caller's handler only
  // for explicit news-bulletin/selected-news/news-items/script/metadata
  // endpoints. This prevents a single catch-all payload (e.g. onboarding)
  // from reaching list-shaped consumers and crashing iteration.
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () => {
        if (url.includes("/notifications")) return Promise.resolve([]);
        if (url.includes("/modules")) return Promise.resolve([]);
        if (url.includes("/visibility-rules")) return Promise.resolve([]);
        if (url.includes("/credentials")) return Promise.resolve([]);
        if (url.includes("/users") && !url.includes("/news")) {
          return Promise.resolve([]);
        }
        return Promise.resolve(handler(url));
      },
    })
  ) as unknown as typeof window.fetch;
}

function renderAt(path: string, state?: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const entry = state ? { pathname: path, state } : path;
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "news-bulletins/new", element: <NewsBulletinCreatePage /> },
          { path: "news-bulletins", element: <NewsBulletinRegistryPage /> },
        ],
      },
      {
        path: "/user",
        element: <UserLayout />,
        children: [
          { index: true, element: <UserDashboardPage /> },
          { path: "content", element: <UserContentEntryPage /> },
        ],
      },
    ],
    { initialEntries: [entry] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("News workflow pack (Phase 276-281)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Phase 276: news workflow entry surface", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => ({
        onboarding_required: false,
        completed_at: "2026-04-03T10:00:00Z",
      }));
    });

    it("user content entry shows news bulletin card", () => {
      renderAt("/user/content");
      const card = screen.getByTestId("content-entry-news-bulletin");
      expect(card).toBeDefined();
      // Current copy carries Turkish diacritics; assert with them directly.
      expect(card.textContent).toContain("Haber Bülteni");
      expect(card.textContent).toContain("Haber kaynaklarınızdan seçtiğiniz haberlerle bülten oluşturun");
    });

    it("admin overview no longer exposes quick-link-news-bulletins", () => {
      renderAt("/admin");
      expect(screen.queryByTestId("quick-link-news-bulletins")).toBeNull();
    });

    // PostOnboardingHandoff is referenced as a passive import in
    // UserDashboardPage (kept for module-evaluation side effects); news
    // workflow onboarding copy is covered by the dedicated user-handoff
    // smoke suite, not by this admin-focused pack.
  });

  describe("Phase 276-277: create flow and source/intake clarity", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => ({
        onboarding_required: false,
        completed_at: "2026-04-03T10:00:00Z",
      }));
    });

    it("create page shows heading with testid", () => {
      renderAt("/admin/news-bulletins/new");
      expect(screen.getByTestId("nb-create-heading")).toBeDefined();
      expect(screen.getByTestId("nb-create-heading").textContent).toContain("Yeni Haber Bulteni");
    });

    it("create page shows workflow intro subtitle", () => {
      renderAt("/admin/news-bulletins/new");
      const subtitle = screen.getByTestId("nb-create-subtitle");
      expect(subtitle).toBeDefined();
      expect(subtitle.textContent).toContain("bulten kaydi olusturun");
    });

    it("create page shows workflow chain with source intake", () => {
      renderAt("/admin/news-bulletins/new");
      const chain = screen.getByTestId("nb-create-workflow-chain");
      expect(chain.textContent).toContain("Kaynak Tarama");
      expect(chain.textContent).toContain("Haber Secimi");
      expect(chain.textContent).toContain("Bulten");
      expect(chain.textContent).toContain("Script");
      expect(chain.textContent).toContain("Metadata");
      expect(chain.textContent).toContain("Uretim");
    });

    it("create page has form with submit", () => {
      renderAt("/admin/news-bulletins/new");
      expect(screen.getByText("Oluştur")).toBeDefined();
    });
  });

  describe("Phase 276: registry page clarity", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/news-bulletin")) return [];
        return { onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" };
      });
    });

    it("registry page shows heading with testid", async () => {
      renderAt("/admin/news-bulletins");
      expect(await screen.findByTestId("nb-registry-heading")).toBeDefined();
      expect((await screen.findByTestId("nb-registry-heading")).textContent).toContain("Haber Bulteni Kayitlari");
    });

    it("registry page shows workflow management note", async () => {
      renderAt("/admin/news-bulletins");
      const note = await screen.findByTestId("nb-registry-workflow-note");
      expect(note.textContent).toContain("Bulten secerek");
      expect(note.textContent).toContain("script ve metadata");
    });
  });

  describe("Phase 278-280: detail panel workflow chain and curation", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/selected-news")) return [MOCK_SELECTED_ITEM];
        if (url.includes("/script")) return null;
        if (url.includes("/metadata")) return null;
        if (url.includes("/news-items")) return [MOCK_NEWS_ITEM];
        if (url.includes("/news-bulletin") && url.includes("nb-001")) return MOCK_BULLETIN;
        if (url.includes("/news-bulletin")) return [MOCK_BULLETIN];
        return { onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" };
      });
    });

    it("detail panel shows heading with testid", async () => {
      renderAt("/admin/news-bulletins", { selectedId: "nb-001" });
      expect(await screen.findByTestId("nb-detail-heading")).toBeDefined();
      expect((await screen.findByTestId("nb-detail-heading")).textContent).toContain("Haber Bulteni Detayı");
    });

    it("detail panel shows workflow chain description", async () => {
      renderAt("/admin/news-bulletins", { selectedId: "nb-001" });
      const chain = await screen.findByTestId("nb-detail-workflow-chain");
      expect(chain.textContent).toContain("Kaynak Tarama");
      expect(chain.textContent).toContain("Haber Secimi");
      expect(chain.textContent).toContain("Script");
      expect(chain.textContent).toContain("Metadata");
      expect(chain.textContent).toContain("Uretim");
    });

    it("selected news panel shows curation heading and note", async () => {
      renderAt("/admin/news-bulletins", { selectedId: "nb-001" });
      expect(await screen.findByTestId("nb-selected-news-heading")).toBeDefined();
      const note = await screen.findByTestId("nb-selected-news-note");
      expect(note.textContent).toContain("Kaynaklardan gelen haberlerden");
      expect(note.textContent).toContain("bulten taslagi");
    });

    it("script panel shows heading and generation note", async () => {
      renderAt("/admin/news-bulletins", { selectedId: "nb-001" });
      expect(await screen.findByTestId("nb-script-heading")).toBeDefined();
      const note = await screen.findByTestId("nb-script-note");
      expect(note.textContent).toContain("Secili haberlerden uretilen");
      expect(note.textContent).toContain("haber seciminden sonraki");
    });

    it("metadata panel shows heading and context note", async () => {
      renderAt("/admin/news-bulletins", { selectedId: "nb-001" });
      expect(await screen.findByTestId("nb-metadata-heading")).toBeDefined();
      const note = await screen.findByTestId("nb-metadata-note");
      expect(note.textContent).toContain("baslik, aciklama, etiket");
      expect(note.textContent).toContain("bulten ciktisinin temelini");
    });
  });

  describe("Phase 281: end-to-end entry verification", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => ({
        onboarding_required: false,
        completed_at: "2026-04-03T10:00:00Z",
      }));
    });

    it("user content entry news bulletin card links to create", () => {
      renderAt("/user/content");
      const card = screen.getByTestId("content-entry-news-bulletin");
      // Current copy uses Turkish diacritics ("Yeni Bülten Oluştur").
      expect(card.textContent).toContain("Yeni Bülten Oluştur");
    });

    // quick-link-news-bulletins artik yok (Phase 276); news registry
    // /admin/news-bulletins yolu ile erisilir ama dashboard quick-link
    // degil. DashboardActionHub UserDashboardPage'den kaldirildi; hub-flow
    // dogrulamasi user-section-transition-clarity.smoke.test.tsx'ta yapilir.

    it("admin sources quick link is present", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-sources");
      // Copy is Turkish with diacritics: "Haber kaynaklarını yönetin ve tarayın".
      expect(card.textContent).toMatch(/Haber kaynaklar[ıi]n[ıi]/i);
    });
  });
});
