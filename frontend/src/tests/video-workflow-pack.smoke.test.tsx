import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { StandardVideoCreatePage } from "../pages/admin/StandardVideoCreatePage";
import { StandardVideoDetailPage } from "../pages/admin/StandardVideoDetailPage";
import { JobDetailPage } from "../pages/admin/JobDetailPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";

/* ---- mock data ---- */

const MOCK_VIDEO = {
  id: "sv-001",
  title: "Test Video",
  topic: "Test Topic",
  brief: "Brief",
  target_duration_seconds: 120,
  tone: "informative",
  language: "tr",
  visual_direction: null,
  subtitle_style: null,
  status: "draft",
  job_id: null,
  created_at: "2026-04-03T10:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
  has_script: false,
  has_metadata: false,
};

const MOCK_JOB = {
  id: "job-001",
  module_type: "standard_video",
  status: "running",
  owner_id: null,
  template_id: null,
  source_context_json: null,
  current_step_key: "script",
  retry_count: 0,
  elapsed_total_seconds: 45,
  estimated_remaining_seconds: 120,
  workspace_path: null,
  last_error: null,
  created_at: "2026-04-03T10:00:00Z",
  started_at: "2026-04-03T10:00:05Z",
  finished_at: null,
  updated_at: "2026-04-03T10:00:45Z",
  steps: [
    {
      id: "step-1",
      job_id: "job-001",
      step_key: "script",
      step_order: 1,
      status: "completed",
      artifact_refs_json: null,
      log_text: null,
      elapsed_seconds: 20,
      last_error: null,
      created_at: "2026-04-03T10:00:05Z",
      started_at: "2026-04-03T10:00:05Z",
      finished_at: "2026-04-03T10:00:25Z",
      updated_at: "2026-04-03T10:00:25Z",
    },
    {
      id: "step-2",
      job_id: "job-001",
      step_key: "metadata",
      step_order: 2,
      status: "running",
      artifact_refs_json: null,
      log_text: null,
      elapsed_seconds: 20,
      last_error: null,
      created_at: "2026-04-03T10:00:25Z",
      started_at: "2026-04-03T10:00:25Z",
      finished_at: null,
      updated_at: "2026-04-03T10:00:45Z",
    },
  ],
};

function mockFetch(handler: (url: string) => unknown) {
  // URL-routed safe defaults first; falls back to the caller's handler only
  // for endpoints the test actually cares about. Secondary consumers like
  // useEnabledModules / CommandPalette / users loader must never receive
  // object-shaped payloads meant for /standard-videos, /jobs, etc.
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () => {
        if (url.includes("/notifications")) return Promise.resolve([]);
        if (url.includes("/modules")) return Promise.resolve([]);
        if (url.includes("/visibility-rules")) return Promise.resolve([]);
        if (url.includes("/credentials")) return Promise.resolve([]);
        if (url.includes("/users") && !url.includes("/jobs")) {
          return Promise.resolve([]);
        }
        return Promise.resolve(handler(url));
      },
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
          { path: "standard-videos/new", element: <StandardVideoCreatePage /> },
          { path: "standard-videos/:itemId", element: <StandardVideoDetailPage /> },
          { path: "jobs/:jobId", element: <JobDetailPage /> },
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
    { initialEntries: [path] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("Video workflow pack (Phase 269-275)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Phase 269: create flow clarity", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => ({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" }));
    });

    it("create page shows heading", () => {
      renderAt("/admin/standard-videos/new");
      expect(screen.getByTestId("sv-create-heading")).toBeDefined();
      expect(screen.getByTestId("sv-create-heading").textContent).toContain("Yeni Standard Video");
    });

    it("create page shows workflow intro subtitle", () => {
      renderAt("/admin/standard-videos/new");
      const subtitle = screen.getByTestId("sv-create-subtitle");
      expect(subtitle).toBeDefined();
      expect(subtitle.textContent).toContain("temel bilgileri girin");
      expect(subtitle.textContent).toContain("Script, metadata ve uretim adimlari");
    });

    it("create page has form with submit", () => {
      renderAt("/admin/standard-videos/new");
      expect(screen.getByText("Oluştur")).toBeDefined();
    });
  });

  describe("Phase 270-271: script/metadata step visibility", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/script")) return null;
        if (url.includes("/metadata")) return null;
        if (url.includes("/standard-videos/")) return MOCK_VIDEO;
        return { onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" };
      });
    });

    it("detail page shows heading with testid", async () => {
      renderAt("/admin/standard-videos/sv-001");
      expect(await screen.findByTestId("sv-detail-heading")).toBeDefined();
    });

    it("detail page shows workflow chain description", async () => {
      renderAt("/admin/standard-videos/sv-001");
      const chain = await screen.findByTestId("sv-detail-workflow-chain");
      expect(chain.textContent).toContain("Kayit");
      expect(chain.textContent).toContain("Script");
      expect(chain.textContent).toContain("Metadata");
      expect(chain.textContent).toContain("TTS");
      expect(chain.textContent).toContain("Altyazi");
      expect(chain.textContent).toContain("Kompozisyon");
    });

    it("detail page renders overview, script, and metadata panels", async () => {
      renderAt("/admin/standard-videos/sv-001");
      // Wait for detail to load
      await screen.findByTestId("sv-detail-heading");
      // Panels render — their headings should be visible
      expect(screen.getByText("Script")).toBeDefined();
      expect(screen.getByText("Metadata")).toBeDefined();
    });
  });

  describe("Phase 273: job progress / timeline / ETA continuity", () => {
    beforeEach(() => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/jobs/")) return MOCK_JOB;
        return { onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" };
      });
    });

    it("job detail page shows heading with testid", async () => {
      renderAt("/admin/jobs/job-001");
      expect(await screen.findByTestId("job-detail-heading")).toBeDefined();
    });

    it("job detail shows workflow tracking note", async () => {
      renderAt("/admin/jobs/job-001");
      const note = await screen.findByTestId("job-detail-workflow-note");
      expect(note.textContent).toContain("Ilerleme");
      expect(note.textContent).toContain("operasyonel aksiyonlar");
    });

    it("job detail shows timeline with steps", async () => {
      renderAt("/admin/jobs/job-001");
      await screen.findByTestId("job-detail-heading");
      expect(screen.getByText("Timeline")).toBeDefined();
      // step keys appear in both overview and timeline, use getAllByText
      expect(screen.getAllByText("script").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("metadata").length).toBeGreaterThanOrEqual(1);
    });

    it("job timeline shows step statuses", async () => {
      renderAt("/admin/jobs/job-001");
      await screen.findByTestId("job-detail-heading");
      expect(screen.getAllByText("completed").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("running").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Phase 275: end-to-end entry verification", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => ({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" }));
    });

    it("user content entry still shows video create card", () => {
      renderAt("/user/content");
      const card = screen.getByTestId("content-entry-standard-video");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("Standart Video");
      // UI copy uses Turkish diacritics ("üretimini başlatın").
      expect(card.textContent).toContain("Konu ve stil bilgilerini girerek standart video üretimini başlatın");
    });

    it("admin overview still shows video quick link", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-new-video");
      expect(card).toBeDefined();
      // Copy is "Ana üretim akışı..." (with Turkish diacritics). Use regex to
      // tolerate either ASCII or diacritic variants that future copy polish
      // might apply.
      expect(card.textContent).toMatch(/Ana [uü]retim ak[ıi][sş][ıi]/);
    });

    it.skip("post-onboarding handoff still positions video as primary", async () => {
      // SKIP: PostOnboardingHandoff component is no longer mounted in
      // UserDashboardPage. Coverage for the handoff's own copy lives in
      // post-onboarding-handoff.smoke.test.tsx (component-isolated render).
      expect(true).toBe(true);
    });

    it.skip("dashboard hub flow chain intact", async () => {
      // SKIP: DashboardActionHub / hub-flow-desc was removed from the user
      // dashboard as part of the UserDashboardPage simplification. Hub-like
      // narrative copy is covered by the user-section-transition-clarity
      // smoke test where the component is rendered in isolation.
      expect(true).toBe(true);
    });
  });
});
