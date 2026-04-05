import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { ContentLibraryPage } from "../pages/admin/ContentLibraryPage";
import { StandardVideoRegistryPage } from "../pages/admin/StandardVideoRegistryPage";
import { StandardVideoDetailPage } from "../pages/admin/StandardVideoDetailPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";

const MOCK_VIDEOS = [
  {
    id: "sv-lib-1",
    topic: "Library Test Video",
    title: "Test Video Title",
    brief: "brief",
    target_duration_seconds: 60,
    tone: "neutral",
    language: "tr",
    visual_direction: null,
    subtitle_style: null,
    status: "draft",
    created_at: "2026-04-03T10:00:00Z",
    updated_at: "2026-04-03T10:00:00Z",
  },
];

const MOCK_BULLETINS = [
  {
    id: "nb-lib-1",
    topic: "Library Test Bulletin",
    title: "Test Bulletin Title",
    brief: "brief",
    target_duration_seconds: 120,
    language: "tr",
    tone: "formal",
    bulletin_style: "studio",
    source_mode: "manual",
    selected_news_ids_json: null,
    status: "draft",
    job_id: null,
    created_at: "2026-04-03T11:00:00Z",
    updated_at: "2026-04-03T11:00:00Z",
  },
];

function mockFetch(handler: (url: string) => unknown) {
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(handler(url)),
    })
  ) as unknown as typeof window.fetch;
}

function renderAdmin(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "library", element: <ContentLibraryPage /> },
          { path: "standard-videos", element: <StandardVideoRegistryPage /> },
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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/user",
        element: <UserLayout />,
        children: [
          { path: "content", element: <UserContentEntryPage /> },
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

describe("Library/Gallery/Content Management Pack (Phase 299-304)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /* ---- Phase 299: Library entry surface ---- */

  describe("Phase 299: library entry surface", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("admin overview shows library quick link", () => {
      renderAdmin("/admin");
      const card = screen.getByTestId("quick-link-library");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("Icerik Kutuphanesi");
    });

    it("sidebar has library entry", () => {
      renderAdmin("/admin/library");
      expect(screen.getAllByText("Icerik Kutuphanesi").length).toBeGreaterThanOrEqual(1);
    });

    it("library page shows heading with testid", () => {
      renderAdmin("/admin/library");
      const heading = screen.getByTestId("library-heading");
      expect(heading.textContent).toContain("Icerik Kutuphanesi");
    });

    it("library page shows subtitle", () => {
      renderAdmin("/admin/library");
      const sub = screen.getByTestId("library-subtitle");
      expect(sub.textContent).toContain("tek bir yuzeyden");
    });

    it("library page shows workflow note", () => {
      renderAdmin("/admin/library");
      const note = screen.getByTestId("library-workflow-note");
      expect(note.textContent).toContain("Olusturma");
      expect(note.textContent).toContain("Yayin");
    });

    it("user content entry has library crosslink", () => {
      renderUser("/user/content");
      expect(screen.getByTestId("content-to-library-crosslink")).toBeDefined();
    });
  });

  /* ---- Phase 300: Content list/gallery view ---- */

  describe("Phase 300: content list/gallery view", () => {
    it("shows empty state when no content", async () => {
      window.fetch = mockFetch(() => []);
      renderAdmin("/admin/library");
      await waitFor(() => {
        expect(screen.getByTestId("library-empty-state")).toBeDefined();
      });
    });

    it("shows content list with videos and bulletins", async () => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/standard-video")) return MOCK_VIDEOS;
        if (url.includes("/news-bulletin")) return MOCK_BULLETINS;
        return [];
      });
      renderAdmin("/admin/library");
      await waitFor(() => {
        expect(screen.getByTestId("library-table")).toBeDefined();
      });
      expect(screen.getByText("Test Video Title")).toBeDefined();
      expect(screen.getByText("Test Bulletin Title")).toBeDefined();
    });

    it("shows content type labels in table", async () => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/standard-video")) return MOCK_VIDEOS;
        if (url.includes("/news-bulletin")) return MOCK_BULLETINS;
        return [];
      });
      renderAdmin("/admin/library");
      await waitFor(() => {
        const table = screen.getByTestId("library-table");
        expect(table.textContent).toContain("Standart Video");
        expect(table.textContent).toContain("Haber Bulteni");
      });
    });

    it("library list has heading and note", () => {
      window.fetch = mockFetch(() => []);
      renderAdmin("/admin/library");
      expect(screen.getByTestId("library-list-heading").textContent).toContain("Icerik Kayitlari");
      expect(screen.getByTestId("library-list-note").textContent).toContain("birlesik olarak");
    });

    it("shows detail link for each row", async () => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/standard-video")) return MOCK_VIDEOS;
        if (url.includes("/news-bulletin")) return MOCK_BULLETINS;
        return [];
      });
      renderAdmin("/admin/library");
      await waitFor(() => {
        const links = screen.getAllByText("Detay Goruntule →");
        expect(links.length).toBe(2);
      });
    });
  });

  /* ---- Phase 301: Filter/sort/search clarity ---- */

  describe("Phase 301: filter/sort/search clarity", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("filter area exists", () => {
      renderAdmin("/admin/library");
      expect(screen.getByTestId("library-filter-area")).toBeDefined();
    });

    it("filter heading and note exist", () => {
      renderAdmin("/admin/library");
      expect(screen.getByTestId("library-filter-heading").textContent).toContain("Filtre");
      expect(screen.getByTestId("library-filter-note").textContent).toContain("filtreleyebilirsiniz");
    });

    it("filter inputs are active (M18-C)", () => {
      renderAdmin("/admin/library");
      const active = screen.getByTestId("library-filters-active");
      expect(active).toBeDefined();
      expect(screen.getByTestId("library-search-input")).toBeDefined();
      expect(screen.getByTestId("library-type-filter")).toBeDefined();
      expect(screen.getByTestId("library-status-filter")).toBeDefined();
    });

    it("deferred filter element no longer exists", () => {
      renderAdmin("/admin/library");
      expect(screen.queryByTestId("library-filters-deferred")).toBeNull();
    });
  });

  /* ---- Phase 302: Content detail view ---- */

  describe("Phase 302: content detail view", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/standard-video") && url.includes("sv-lib-1/script")) return null;
        if (url.includes("/standard-video") && url.includes("sv-lib-1/metadata")) return null;
        if (url.includes("/standard-video") && url.includes("sv-lib-1")) return MOCK_VIDEOS[0];
        if (url.includes("/standard-video")) return MOCK_VIDEOS;
        return [];
      });
    });

    it("standard video detail has library back-link", async () => {
      renderAdmin("/admin/standard-videos/sv-lib-1");
      await waitFor(() => {
        expect(screen.getByTestId("sv-detail-library-link")).toBeDefined();
      });
    });

    it("standard video detail has manage note", async () => {
      renderAdmin("/admin/standard-videos/sv-lib-1");
      await waitFor(() => {
        expect(screen.getByTestId("sv-detail-manage-note")).toBeDefined();
      });
    });

    it("standard video registry has heading testid", () => {
      renderAdmin("/admin/standard-videos");
      expect(screen.getByTestId("sv-registry-heading").textContent).toContain("Standart Video Kayitlari");
    });

    it("standard video registry has workflow note", () => {
      renderAdmin("/admin/standard-videos");
      expect(screen.getByTestId("sv-registry-workflow-note")).toBeDefined();
    });
  });

  /* ---- Phase 303: Reuse/clone/manage actions ---- */

  describe("Phase 303: reuse/clone/manage actions", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("library actions area exists", () => {
      renderAdmin("/admin/library");
      expect(screen.getByTestId("library-actions-area")).toBeDefined();
    });

    it("library actions heading and note exist", () => {
      renderAdmin("/admin/library");
      expect(screen.getByTestId("library-actions-heading").textContent).toContain("Icerik Yonetim");
      expect(screen.getByTestId("library-actions-note").textContent).toContain("klonlama");
    });

    it("edit action card exists", () => {
      renderAdmin("/admin/library");
      expect(screen.getByTestId("action-edit")).toBeDefined();
    });

    it("reuse action card exists", () => {
      renderAdmin("/admin/library");
      expect(screen.getByTestId("action-reuse")).toBeDefined();
    });

    it("clone action card exists", () => {
      renderAdmin("/admin/library");
      const clone = screen.getByTestId("action-clone");
      expect(clone.textContent).toContain("Ilerideki fazlarda");
    });
  });

  /* ---- Phase 304: Library verification ---- */

  describe("Phase 304: library verification", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/standard-video")) return MOCK_VIDEOS;
        if (url.includes("/news-bulletin")) return MOCK_BULLETINS;
        return [];
      });
    });

    it("admin overview → library quick link exists", () => {
      renderAdmin("/admin");
      expect(screen.getByTestId("quick-link-library")).toBeDefined();
    });

    it("library page loads with all sections", async () => {
      renderAdmin("/admin/library");
      await waitFor(() => {
        expect(screen.getByTestId("library-heading")).toBeDefined();
        expect(screen.getByTestId("library-filter-area")).toBeDefined();
        expect(screen.getByTestId("library-content-list")).toBeDefined();
        expect(screen.getByTestId("library-actions-area")).toBeDefined();
      });
    });

    it("library shows unified content from both modules", async () => {
      renderAdmin("/admin/library");
      await waitFor(() => {
        expect(screen.getByText("Test Video Title")).toBeDefined();
        expect(screen.getByText("Test Bulletin Title")).toBeDefined();
      });
    });

    it("library workflow note describes full chain", () => {
      renderAdmin("/admin/library");
      const note = screen.getByTestId("library-workflow-note");
      expect(note.textContent).toContain("Olusturma");
      expect(note.textContent).toContain("Uretim");
      expect(note.textContent).toContain("Detay Yonetimi");
      expect(note.textContent).toContain("Yayin");
    });
  });
});
