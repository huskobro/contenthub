import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { JobsRegistryPage } from "../pages/admin/JobsRegistryPage";
import { JobDetailPage } from "../pages/admin/JobDetailPage";
import type { JobResponse } from "../api/jobsApi";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_JOBS: JobResponse[] = [
  {
    id: "j1",
    module_type: "standard_video",
    status: "queued",
    owner_id: null,
    template_id: null,
    source_context_json: null,
    current_step_key: null,
    retry_count: 0,
    elapsed_total_seconds: null,
    estimated_remaining_seconds: null,
    workspace_path: null,
    last_error: null,
    created_at: "2026-04-01T10:00:00Z",
    started_at: null,
    finished_at: null,
    updated_at: "2026-04-01T10:00:00Z",
    steps: [],
  },
  {
    id: "j2",
    module_type: "news_bulletin",
    status: "failed",
    owner_id: null,
    template_id: "t1",
    source_context_json: null,
    current_step_key: "script",
    retry_count: 2,
    elapsed_total_seconds: 90,
    estimated_remaining_seconds: null,
    workspace_path: "/workspace/j2",
    last_error: "TTS provider timeout",
    created_at: "2026-04-01T11:00:00Z",
    started_at: "2026-04-01T11:00:05Z",
    finished_at: "2026-04-01T11:01:35Z",
    updated_at: "2026-04-01T11:01:35Z",
    steps: [
      {
        id: "s1",
        job_id: "j2",
        step_key: "script",
        step_order: 1,
        status: "failed",
        artifact_refs_json: null,
        provider_trace_json: null,
        log_text: null,
        elapsed_seconds: 90,
        last_error: "TTS provider timeout",
        created_at: "2026-04-01T11:00:05Z",
        started_at: "2026-04-01T11:00:05Z",
        finished_at: "2026-04-01T11:01:35Z",
        updated_at: "2026-04-01T11:01:35Z",
      },
    ],
  },
];

const MOCK_JOB_DETAIL: JobResponse = MOCK_JOBS[1];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mockFetch(handler: (url: string) => unknown) {
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(handler(url)),
    })
  ) as unknown as typeof window.fetch;
}

function renderAt(path: string) {
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
          { path: "jobs", element: <JobsRegistryPage /> },
          { path: "jobs/:jobId", element: <JobDetailPage /> },
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
/*  Phase 310 — Batch operations entry surface                         */
/* ------------------------------------------------------------------ */

describe("Phase 310 — Batch operations entry surface", () => {
  it("admin overview jobs quick link has batch/queue context", () => {
    window.fetch = mockFetch(() => []);
    renderAt("/admin");
    const card = screen.getByTestId("quick-link-jobs");
    expect(card.textContent).toContain("toplu operasyon");
  });

  it("admin overview jobs quick link has kuyruk context", () => {
    window.fetch = mockFetch(() => []);
    renderAt("/admin");
    const card = screen.getByTestId("quick-link-jobs");
    expect(card.textContent).toContain("kuyruk");
  });

  it("jobs registry has subtitle with batch/queue context", () => {
    window.fetch = mockFetch(() => MOCK_JOBS);
    renderAt("/admin/jobs");
    const subtitle = screen.getByTestId("jobs-registry-subtitle");
    expect(subtitle).toBeDefined();
    expect(subtitle.textContent).toContain("kuyruk");
    expect(subtitle.textContent).toContain("toplu");
  });

  it("jobs registry has heading with testid", () => {
    window.fetch = mockFetch(() => MOCK_JOBS);
    renderAt("/admin/jobs");
    expect(screen.getByTestId("jobs-registry-heading")).toBeDefined();
    expect(screen.getByTestId("jobs-registry-heading").textContent).toBe("Uretim Isleri");
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 311 — Queue/job batch control flow                           */
/* ------------------------------------------------------------------ */

describe("Phase 311 — Queue/job batch control flow", () => {
  it("jobs registry workflow note describes queue flow chain", () => {
    window.fetch = mockFetch(() => MOCK_JOBS);
    renderAt("/admin/jobs");
    const note = screen.getByTestId("jobs-registry-workflow-note");
    expect(note.textContent).toContain("Kuyruga Alma");
    expect(note.textContent).toContain("Adim Isleme");
    expect(note.textContent).toContain("Tamamlama");
  });

  it("jobs registry workflow note mentions retry/cancel/skip", () => {
    window.fetch = mockFetch(() => MOCK_JOBS);
    renderAt("/admin/jobs");
    const note = screen.getByTestId("jobs-registry-workflow-note");
    expect(note.textContent).toContain("retry");
    expect(note.textContent).toContain("cancel");
    expect(note.textContent).toContain("skip");
  });

  it("job overview panel shows Turkish labels for queue context", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      expect(screen.getByText("Durum")).toBeDefined();
      expect(screen.getByText("Aktif Adim")).toBeDefined();
      expect(screen.getByText("Yeniden Deneme Sayisi")).toBeDefined();
    });
  });

  it("job overview panel shows queue-relevant labels", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      expect(screen.getByText("Toplam Gecen Sure")).toBeDefined();
      expect(screen.getByText("Tahmini Kalan")).toBeDefined();
      expect(screen.getByText("Son Hata")).toBeDefined();
    });
  });

  it("job overview publish note mentions kuyruk", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      const note = screen.getByTestId("job-overview-publish-note");
      expect(note.textContent).toContain("Kuyruk");
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 312 — Retry/cancel/skip behavior clarity                     */
/* ------------------------------------------------------------------ */

describe("Phase 312 — Retry/cancel/skip behavior clarity", () => {
  it("job detail page workflow note mentions retry/cancel/skip", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      const note = screen.getByTestId("job-detail-workflow-note");
      expect(note.textContent).toContain("retry");
      expect(note.textContent).toContain("cancel");
      expect(note.textContent).toContain("skip");
    });
  });

  it("job detail page has actions panel with testid", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      expect(screen.getByTestId("job-actions-panel")).toBeDefined();
    });
  });

  it("actions panel shows operational actions heading", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      const panel = screen.getByTestId("job-actions-panel");
      expect(panel.textContent).toContain("Operasyonel Aksiyonlar");
    });
  });

  it("actions panel mentions action labels by name", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      const panel = screen.getByTestId("job-actions-panel");
      expect(panel.textContent).toContain("Yeniden Dene");
      expect(panel.textContent).toContain("Iptal Et");
    });
  });

  it("action buttons are present in the panel", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      expect(screen.getByTestId("job-actions-panel")).toBeDefined();
    });
    // M16: butonlar artik gercek — retry ve cancel butonlari mevcut
    expect(screen.getByTestId("action-retry")).toBeDefined();
    expect(screen.getByTestId("action-cancel")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 313 — End-to-end verification                                */
/* ------------------------------------------------------------------ */

describe("Phase 313 — Batch operations end-to-end verification", () => {
  it("admin overview → jobs link exists and has batch context", () => {
    window.fetch = mockFetch(() => []);
    renderAt("/admin");
    const card = screen.getByTestId("quick-link-jobs");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Isler");
  });

  it("jobs registry chain: heading + subtitle + workflow note all present", () => {
    window.fetch = mockFetch(() => MOCK_JOBS);
    renderAt("/admin/jobs");
    expect(screen.getByTestId("jobs-registry-heading")).toBeDefined();
    expect(screen.getByTestId("jobs-registry-subtitle")).toBeDefined();
    expect(screen.getByTestId("jobs-registry-workflow-note")).toBeDefined();
  });

  it("job detail chain: heading + workflow note + overview + actions panel all present", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      expect(screen.getByTestId("job-detail-heading")).toBeDefined();
      expect(screen.getByTestId("job-detail-workflow-note")).toBeDefined();
      expect(screen.getByTestId("job-overview-heading")).toBeDefined();
      expect(screen.getByTestId("job-actions-panel")).toBeDefined();
    });
  });

  it("failed job shows retry count and last error in overview", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      expect(screen.getByText("Yeniden Deneme Sayisi")).toBeDefined();
      expect(screen.getAllByText("TTS provider timeout").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("job overview shows Turkish identity labels", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      expect(screen.getByText("Is Kimlik")).toBeDefined();
      expect(screen.getByText("Modul Turu")).toBeDefined();
      expect(screen.getByText("Sablon")).toBeDefined();
      expect(screen.getByText("Calisma Alani")).toBeDefined();
    });
  });

  it("job overview shows date labels in Turkish", async () => {
    window.fetch = mockFetch(() => MOCK_JOB_DETAIL);
    renderAt("/admin/jobs/j2");
    await waitFor(() => {
      expect(screen.getByText("Olusturulma")).toBeDefined();
      expect(screen.getByText("Baslanma")).toBeDefined();
      expect(screen.getByText("Tamamlanma")).toBeDefined();
    });
  });
});
