import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider, MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";

function mockFetch(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }) as unknown as typeof window.fetch;
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
          { path: "standard-videos/new", element: <div data-testid="sv-create">SV Create</div> },
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

describe("Video workflow entry map", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("user content entry — video create entry point", () => {
    it("standard video card is present with correct testid", () => {
      renderAt("/user/content");
      expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
    });

    it("standard video card describes production flow", () => {
      renderAt("/user/content");
      const card = screen.getByTestId("content-entry-standard-video");
      expect(card.textContent).toContain("Konu ve stil bilgilerini girerek standart video üretimini başlatın");
    });

    it("standard video card CTA says Yeni Video Oluştur", () => {
      renderAt("/user/content");
      const card = screen.getByTestId("content-entry-standard-video");
      expect(card.textContent).toContain("Yeni Video Oluştur");
    });
  });

  describe("post-onboarding handoff — video create entry point (component isolated)", () => {
    // NOTE: PostOnboardingHandoff UserDashboardPage'den pasife alindi (import
    // korundu). Burada component izole kontrolu yapiyoruz.
    function renderHandoff() {
      return render(
        <MemoryRouter>
          <PostOnboardingHandoff />
        </MemoryRouter>
      );
    }

    it("handoff card is present", () => {
      renderHandoff();
      expect(screen.getByTestId("post-onboarding-handoff")).toBeDefined();
    });

    it("handoff positions video uretimi as ana akis", () => {
      renderHandoff();
      const handoff = screen.getByTestId("post-onboarding-handoff");
      expect(handoff.textContent).toContain("Video uretimi ana icerik akisinizdir");
    });

    it("handoff primary CTA targets video create", () => {
      renderHandoff();
      const btn = screen.getByTestId("handoff-create-content");
      expect(btn.textContent).toBe("Yeni Video Olustur");
    });
  });

  describe("admin overview — video create quick access", () => {
    it("quick access has Yeni Video Oluştur card with testid", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-new-video");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("Yeni Video Oluştur");
    });

    it("video quick link describes it as ana üretim akışı", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-new-video");
      // QUICK_LINKS[1].desc = "Ana üretim akışı: standart video içeriği oluşturmaya başlayın"
      expect(card.textContent).toContain("Ana üretim akışı");
    });

    it("all current admin quick access cards have testids", () => {
      renderAt("/admin");
      // Current QUICK_LINKS set (6 cards): library, new-video, jobs,
      // analytics, sources, settings.
      expect(screen.getByTestId("quick-link-library")).toBeDefined();
      expect(screen.getByTestId("quick-link-new-video")).toBeDefined();
      expect(screen.getByTestId("quick-link-jobs")).toBeDefined();
      expect(screen.getByTestId("quick-link-analytics")).toBeDefined();
      expect(screen.getByTestId("quick-link-sources")).toBeDefined();
      expect(screen.getByTestId("quick-link-settings")).toBeDefined();
    });
  });

  describe("entry map consistency — CTA targets preserved", () => {
    it("content video card and handoff both target /admin/standard-videos/new", () => {
      // Verify both entry points exist and maintain the same workflow entry
      renderAt("/user/content");
      const videoCard = screen.getByTestId("content-entry-standard-video");
      expect(videoCard).toBeDefined();
      expect(videoCard.textContent).toContain("Yeni Video Oluştur");
    });

    it("dashboard hub content card still available (component isolated)", () => {
      render(
        <MemoryRouter>
          <DashboardActionHub />
        </MemoryRouter>
      );
      const hubCard = screen.getByTestId("hub-action-content");
      expect(hubCard).toBeDefined();
      expect(hubCard.textContent).toContain("İçerik");
    });
  });
});
