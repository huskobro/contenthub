import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserPublishEntryPage } from "../pages/UserPublishEntryPage";
import { JobsRegistryPage } from "../pages/admin/JobsRegistryPage";
import { JobDetailPage } from "../pages/admin/JobDetailPage";
import { StandardVideoDetailPage } from "../pages/admin/StandardVideoDetailPage";

/* ---- mock data ---- */

const MOCK_JOBS = [
  {
    id: "j-pub-1",
    module_type: "standard_video",
    status: "completed",
    owner_id: null,
    template_id: "tpl-001",
    source_context_json: null,
    current_step_key: null,
    retry_count: 0,
    elapsed_total_seconds: 120,
    estimated_remaining_seconds: null,
    workspace_path: "/workspace/j-pub-1",
    last_error: null,
    created_at: "2026-04-03T10:00:00Z",
    started_at: "2026-04-03T10:00:01Z",
    finished_at: "2026-04-03T10:02:01Z",
    updated_at: "2026-04-03T10:02:01Z",
    steps: [],
  },
];

const MOCK_VIDEO = {
  id: "sv-pub-1",
  topic: "Test Video",
  title: "Publish Test",
  brief: "brief",
  target_duration_seconds: 60,
  tone: "neutral",
  language: "tr",
  visual_direction: null,
  subtitle_style: null,
  status: "draft",
  created_at: "2026-04-03T10:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
};

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
          { path: "jobs", element: <JobsRegistryPage /> },
          { path: "jobs/:jobId", element: <JobDetailPage /> },
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

describe("YouTube Publish Workflow Pack (Phase 287-292)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /* ---- Phase 287: Publish entry surface ---- */

  describe("Phase 287: publish entry surface clarity", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("user publish page shows workflow chain testid", () => {
      renderUser("/user/publish");
      const chain = screen.getByTestId("publish-workflow-chain");
      expect(chain).toBeDefined();
      expect(chain.textContent).toContain("Icerik Uretimi");
      expect(chain.textContent).toContain("YouTube Yayini");
      expect(chain.textContent).toContain("Sonuc Takibi");
    });

    it("user publish page shows jobs card with readiness desc", () => {
      renderUser("/user/publish");
      const card = screen.getByTestId("publish-entry-jobs");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("yayin hazirligini takip edin");
    });

    it("user publish page shows videos card with publish trigger desc", () => {
      renderUser("/user/publish");
      const card = screen.getByTestId("publish-entry-standard-videos");
      expect(card.textContent).toContain("YouTube yayini tetiklenebilir");
    });

    it("user publish page shows news card with publish start desc", () => {
      renderUser("/user/publish");
      const card = screen.getByTestId("publish-entry-news-bulletins");
      expect(card.textContent).toContain("yayin sureci baslatilabilir");
    });

    it("user publish page shows first-use note", () => {
      renderUser("/user/publish");
      expect(screen.getByTestId("publish-first-use-note")).toBeDefined();
    });

    it("user publish page shows crosslink to content", () => {
      renderUser("/user/publish");
      expect(screen.getByTestId("publish-to-content-crosslink")).toBeDefined();
    });
  });

  /* ---- Phase 288: Jobs registry publish context ---- */

  describe("Phase 288: jobs registry publish context", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/jobs")) return MOCK_JOBS;
        return [];
      });
    });

    it("jobs registry shows updated heading with testid", () => {
      renderAdmin("/admin/jobs");
      const heading = screen.getByTestId("jobs-registry-heading");
      expect(heading).toBeDefined();
      expect(heading.textContent).toContain("Uretim Isleri");
    });

    it("jobs registry shows workflow note with publish context", () => {
      renderAdmin("/admin/jobs");
      const note = screen.getByTestId("jobs-registry-workflow-note");
      expect(note.textContent).toContain("yayin hazirligini");
      expect(note.textContent).toContain("yayin adimina hazir");
    });

    it("admin overview jobs quick link has publish context", () => {
      renderAdmin("/admin");
      const card = screen.getByTestId("quick-link-jobs");
      expect(card.textContent).toContain("yayin hazirligini takip et");
    });
  });

  /* ---- Phase 289: Job detail publish readiness ---- */

  describe("Phase 289: job detail publish readiness", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/jobs/j-pub-1")) return MOCK_JOBS[0];
        if (url.includes("/jobs")) return MOCK_JOBS;
        return [];
      });
    });

    it("job detail workflow note includes publish readiness mention", async () => {
      renderAdmin("/admin/jobs/j-pub-1");
      await waitFor(() => {
        const note = screen.getByTestId("job-detail-workflow-note");
        expect(note.textContent).toContain("yayin hazirlik durumu");
      });
    });

    it("job overview panel shows publish readiness note", async () => {
      renderAdmin("/admin/jobs/j-pub-1");
      await waitFor(() => {
        const note = screen.getByTestId("job-overview-publish-note");
        expect(note.textContent).toContain("yayin adimina gecebilir");
      });
    });

    it("job overview panel has heading testid", async () => {
      renderAdmin("/admin/jobs/j-pub-1");
      await waitFor(() => {
        expect(screen.getByTestId("job-overview-heading")).toBeDefined();
      });
    });
  });

  /* ---- Phase 290: Standard video publish chain ---- */

  describe("Phase 290: standard video publish chain extension", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/standard-videos/sv-pub-1/script")) return null;
        if (url.includes("/standard-videos/sv-pub-1/metadata")) return null;
        if (url.includes("/standard-videos/sv-pub-1")) return MOCK_VIDEO;
        return [];
      });
    });

    it("standard video detail workflow chain mentions publish readiness", async () => {
      renderAdmin("/admin/standard-videos/sv-pub-1");
      await waitFor(() => {
        const chain = screen.getByTestId("sv-detail-workflow-chain");
        expect(chain.textContent).toContain("yayin sureci baslatilabilir");
      });
    });
  });

  /* ---- Phase 291: Cross-surface consistency ---- */

  describe("Phase 291: cross-surface publish flow consistency", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("publish entry page has section subtitle", () => {
      renderUser("/user/publish");
      const sub = screen.getByTestId("publish-section-subtitle");
      expect(sub.textContent).toContain("Yayin ve dagitim merkezi");
    });

    it("publish workflow chain lists all 5 steps", () => {
      renderUser("/user/publish");
      const chain = screen.getByTestId("publish-workflow-chain");
      expect(chain.textContent).toContain("Icerik Uretimi");
      expect(chain.textContent).toContain("Readiness Kontrolu");
      expect(chain.textContent).toContain("Metadata Finalizasyonu");
      expect(chain.textContent).toContain("YouTube Yayini");
      expect(chain.textContent).toContain("Sonuc Takibi");
    });

    it("all three publish entry cards are present", () => {
      renderUser("/user/publish");
      expect(screen.getByTestId("publish-entry-jobs")).toBeDefined();
      expect(screen.getByTestId("publish-entry-standard-videos")).toBeDefined();
      expect(screen.getByTestId("publish-entry-news-bulletins")).toBeDefined();
    });

    it("publish crosslink area is visible", () => {
      renderUser("/user/publish");
      expect(screen.getByTestId("publish-crosslink-area")).toBeDefined();
    });
  });
});
