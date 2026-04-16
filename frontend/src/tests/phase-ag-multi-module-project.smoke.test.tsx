/**
 * PHASE AG — multi-module ContentProject frontend smoke.
 *
 * Tek bir proje artik birden cok modulden is (standard_video / news_bulletin /
 * product_review) barindirir. Bu smoke setup'lari Frontend Commit 3'un guvenlik
 * iplerini ceker:
 *
 *   1. MyProjectsPage:
 *      - "Yeni Proje" actigi modalda modul secimi YOK (sadece baslik + kanal +
 *        optional aciklama).
 *      - Projeler tablosunda modul hucresi karma proje icin "Karma", eski
 *        kayit icin "X (legacy)" gosterir.
 *
 *   2. ProjectDetailPage:
 *      - Karma projede "Ana modül" etiketi "Karma (modül-üstü)" yazar.
 *      - 3 launcher karti (standard_video / news_bulletin / product_review)
 *        her tiklamasinda contentProjectId + channelProfileId query param'lari
 *        ile ilgili wizard rotasina gider (deep-link contract korunuyor).
 *      - Eski (legacy) modul-locked projelerde "Ana modül" etiketi
 *        "Standart Video (legacy)" yazar.
 *
 * Ownership ve full-auto guard backend'de zorlanir; smoke yalnizca UX
 * yuzeylerini kanitlar.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Shared shallow mocks
// ---------------------------------------------------------------------------

// Surface overrides OFF — legacy body under test.
vi.mock("../surfaces", () => ({
  useSurfacePageOverride: () => null,
}));

// Heavy / tangential components not under test.
vi.mock("../components/full-auto/ProjectAutomationPanel", () => ({
  ProjectAutomationPanel: () => null,
}));
vi.mock("../components/preview/JobPreviewList", () => ({
  JobPreviewList: () => null,
}));

// Publish + toast + standard video hooks — not under test here.
vi.mock("../hooks/usePublish", () => ({
  usePublishRecordsByProject: () => ({ data: [], isLoading: false }),
}));
vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));
vi.mock("../api/jobsApi", () => ({
  fetchJobs: vi.fn(async () => []),
}));
vi.mock("../api/standardVideoApi", () => ({
  fetchStandardVideos: vi.fn(async () => []),
  startStandardVideoProduction: vi.fn(),
}));

// Authenticated user for both pages.
vi.mock("../stores/authStore", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      user: {
        id: "u-ag-1",
        email: "ag-user@contenthub.test",
        display_name: "AG User",
      },
    }),
}));

// Channels list (shared by both pages).
vi.mock("../hooks/useChannelProfiles", () => ({
  useChannelProfiles: () => ({
    data: [
      {
        id: "ch-ag-1",
        profile_name: "AG Channel",
        channel_slug: "ag-channel",
        default_language: "tr",
        profile_type: "youtube",
        status: "active",
      },
    ],
    isLoading: false,
  }),
  useChannelProfile: () => ({
    data: {
      id: "ch-ag-1",
      profile_name: "AG Channel",
      channel_slug: "ag-channel",
      default_language: "tr",
      profile_type: "youtube",
      status: "active",
      handle: "ag_channel",
      title: "AG Channel",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    isLoading: false,
  }),
}));

// ---------------------------------------------------------------------------
// ContentProjects hook mock with swappable state per test
// ---------------------------------------------------------------------------

const createProjectMutateAsync = vi.fn(async (payload: unknown) => ({
  id: "proj-new-ag",
  ...((payload as Record<string, unknown>) ?? {}),
  content_status: "draft",
  review_status: "not_required",
  publish_status: "unpublished",
  primary_platform: null,
  origin_type: "manual",
  priority: "normal",
  deadline_at: null,
  active_job_id: null,
  latest_output_ref: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  current_stage: null,
  description: (payload as Record<string, unknown>)?.description ?? null,
}));

const mockProjectState: {
  detail: Record<string, unknown> | null;
  list: Array<Record<string, unknown>>;
} = { detail: null, list: [] };

vi.mock("../hooks/useContentProjects", () => ({
  useContentProjects: () => ({
    data: mockProjectState.list,
    isLoading: false,
    isError: false,
  }),
  useContentProject: () => ({
    data: mockProjectState.detail,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useProjectSummary: () => ({
    data: {
      project_id: (mockProjectState.detail?.id as string) ?? "proj",
      jobs: {
        total: 0,
        by_status: {},
        by_module: {},
        last_created_at: null,
      },
      publish: { total: 0, by_status: {}, last_published_at: null },
    },
    isLoading: false,
    isError: false,
  }),
  useProjectJobs: () => ({ data: [], isLoading: false, isError: false }),
  useCreateContentProject: () => ({
    mutateAsync: createProjectMutateAsync,
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import { MyProjectsPage } from "../pages/user/MyProjectsPage";
import { ProjectDetailPage } from "../pages/user/ProjectDetailPage";

// Route spy to assert navigation + query string contract.
function RouteSpy() {
  const loc = useLocation();
  return (
    <div data-testid="route-spy">
      {loc.pathname}
      {loc.search}
    </div>
  );
}

function Harness({
  initialPath,
}: {
  initialPath: string;
}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/user/projects" element={<MyProjectsPage />} />
          <Route path="/user/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/user/create/video" element={<RouteSpy />} />
          <Route path="/user/create/bulletin" element={<RouteSpy />} />
          <Route path="/user/create/product-review" element={<RouteSpy />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// MyProjectsPage smoke
// ---------------------------------------------------------------------------

describe("PHASE AG — MyProjectsPage create modal has no module picker", () => {
  beforeEach(() => {
    mockProjectState.list = [
      {
        id: "proj-ag-mixed",
        user_id: "u-ag-1",
        channel_profile_id: "ch-ag-1",
        module_type: null, // karma proje
        title: "Karma Proje",
        description: null,
        current_stage: null,
        content_status: "in_progress",
        review_status: "not_required",
        publish_status: "unpublished",
        primary_platform: null,
        origin_type: "manual",
        priority: "normal",
        deadline_at: null,
        active_job_id: null,
        latest_output_ref: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "proj-ag-legacy",
        user_id: "u-ag-1",
        channel_profile_id: "ch-ag-1",
        module_type: "standard_video", // legacy modul-locked
        title: "Legacy Video Projesi",
        description: null,
        current_stage: null,
        content_status: "completed",
        review_status: "not_required",
        publish_status: "unpublished",
        primary_platform: null,
        origin_type: "manual",
        priority: "normal",
        deadline_at: null,
        active_job_id: null,
        latest_output_ref: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    createProjectMutateAsync.mockClear();
  });

  it("tabloda karma proje icin 'Karma' yazar", () => {
    render(<Harness initialPath="/user/projects" />);
    const table = screen.getByTestId("projects-data-table");
    expect(within(table).getByText("Karma Proje")).toBeTruthy();
    // Karma etiketi module hucresinde.
    expect(within(table).getByText("Karma")).toBeTruthy();
  });

  it("tabloda legacy proje icin 'X (legacy)' yazar", () => {
    render(<Harness initialPath="/user/projects" />);
    const table = screen.getByTestId("projects-data-table");
    expect(within(table).getByText("Legacy Video Projesi")).toBeTruthy();
    expect(within(table).getByText("Standart Video (legacy)")).toBeTruthy();
  });

  it("'Yeni Proje' modali modul seciminde sormaz; baslik + kanal ile olusturur", async () => {
    render(<Harness initialPath="/user/projects" />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("projects-create-button"));

    const modal = await screen.findByTestId("create-project-modal");
    // Kritik: modalda modul secici <select> veya modul secenegi YOK.
    // (Modal helper text'inde "modül-üstü" gecebilir — kelime kendisini
    //  yasaklamiyoruz; yasakli olan modul secim kontrolu.)
    const selects = modal.querySelectorAll("select");
    // Sadece kanal secici <select> olmalidir; modul secici yok.
    expect(selects.length).toBe(1);
    expect(selects[0].getAttribute("data-testid")).toBe(
      "create-project-channel",
    );
    // Acik modul option etiketi de bulunmamali.
    expect(
      within(modal).queryByRole("option", { name: /Standart Video/i }),
    ).toBeNull();
    expect(
      within(modal).queryByRole("option", { name: /Haber Bülteni/i }),
    ).toBeNull();
    expect(
      within(modal).queryByRole("option", { name: /Ürün İncelemes/i }),
    ).toBeNull();

    // Baslik + kanal dolduralim.
    await user.type(
      within(modal).getByTestId("create-project-title"),
      "Yeni Karma Proje",
    );
    await user.selectOptions(
      within(modal).getByTestId("create-project-channel"),
      "ch-ag-1",
    );

    await user.click(within(modal).getByTestId("create-project-submit"));

    await waitFor(() => {
      expect(createProjectMutateAsync).toHaveBeenCalledTimes(1);
    });
    const call = createProjectMutateAsync.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    // PHASE AG: module_type GONDERILMEDI — backend default "mixed" atar.
    expect(call.module_type).toBeUndefined();
    expect(call.user_id).toBe("u-ag-1");
    expect(call.channel_profile_id).toBe("ch-ag-1");
    expect(call.title).toBe("Yeni Karma Proje");
  });
});

// ---------------------------------------------------------------------------
// ProjectDetailPage smoke
// ---------------------------------------------------------------------------

describe("PHASE AG — ProjectDetailPage mixed vs legacy labeling + launcher", () => {
  beforeEach(() => {
    createProjectMutateAsync.mockClear();
  });

  it("karma proje 'Ana modül: Karma (modül-üstü)' yazar", () => {
    mockProjectState.detail = {
      id: "proj-ag-mixed",
      user_id: "u-ag-1",
      channel_profile_id: "ch-ag-1",
      module_type: null,
      title: "Karma Proje",
      description: null,
      current_stage: null,
      content_status: "in_progress",
      review_status: "not_required",
      publish_status: "unpublished",
      primary_platform: null,
      origin_type: "manual",
      priority: "normal",
      deadline_at: null,
      active_job_id: null,
      latest_output_ref: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    render(<Harness initialPath="/user/projects/proj-ag-mixed" />);
    expect(screen.getByTestId("project-main-module-label").textContent).toBe(
      "Karma (modül-üstü)",
    );
  });

  it("legacy proje 'Ana modül: X (legacy)' yazar", () => {
    mockProjectState.detail = {
      id: "proj-ag-legacy",
      user_id: "u-ag-1",
      channel_profile_id: "ch-ag-1",
      module_type: "standard_video",
      title: "Legacy Video Projesi",
      description: null,
      current_stage: null,
      content_status: "completed",
      review_status: "not_required",
      publish_status: "unpublished",
      primary_platform: null,
      origin_type: "manual",
      priority: "normal",
      deadline_at: null,
      active_job_id: null,
      latest_output_ref: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    render(<Harness initialPath="/user/projects/proj-ag-legacy" />);
    expect(screen.getByTestId("project-main-module-label").textContent).toBe(
      "Standart Video (legacy)",
    );
  });

  it("3 launcher karti deep-link contract ile wizard'a yonlendirir", async () => {
    mockProjectState.detail = {
      id: "proj-ag-mixed",
      user_id: "u-ag-1",
      channel_profile_id: "ch-ag-1",
      module_type: null,
      title: "Karma Proje",
      description: null,
      current_stage: null,
      content_status: "in_progress",
      review_status: "not_required",
      publish_status: "unpublished",
      primary_platform: null,
      origin_type: "manual",
      priority: "normal",
      deadline_at: null,
      active_job_id: null,
      latest_output_ref: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const user = userEvent.setup();

    // 3 launcher'i sirayla kontrol et — her biri ayri render.
    const cases: Array<{
      button: string;
      expectedPath: string;
    }> = [
      {
        button: "project-launcher-standard_video",
        expectedPath: "/user/create/video",
      },
      {
        button: "project-launcher-news_bulletin",
        expectedPath: "/user/create/bulletin",
      },
      {
        button: "project-launcher-product_review",
        expectedPath: "/user/create/product-review",
      },
    ];

    for (const c of cases) {
      const view = render(<Harness initialPath="/user/projects/proj-ag-mixed" />);
      await user.click(screen.getByTestId(c.button));
      const spy = await screen.findByTestId("route-spy");
      const text = spy.textContent ?? "";
      expect(text.startsWith(c.expectedPath)).toBe(true);
      expect(text).toContain("contentProjectId=proj-ag-mixed");
      expect(text).toContain("channelProfileId=ch-ag-1");
      view.unmount();
    }
  });
});
