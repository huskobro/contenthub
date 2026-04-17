import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { UserPublishEntryPage } from "../pages/_scaffolds/UserPublishEntryPage";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";
import { MemoryRouter } from "react-router-dom";

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
        children: [{ index: true, element: <AdminOverviewPage /> }],
      },
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

describe("Navigation closure pack (Phase 264-267 + F48 güncellemesi)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("User task-chain visibility (DashboardActionHub component)", () => {
    // NOTE: DashboardActionHub bu surum'de UserDashboardPage'de default mount
    // edilmiyor. Component'i izole olarak render edip contract'ini dogruluyoruz.
    function renderHub() {
      return render(
        <MemoryRouter>
          <DashboardActionHub />
        </MemoryRouter>
      );
    }

    it("dashboard action hub shows Hızlı Erişim header", () => {
      renderHub();
      expect(screen.getByTestId("dashboard-action-hub")).toBeDefined();
      expect(screen.getAllByText("Hızlı Erişim").length).toBeGreaterThanOrEqual(1);
    });

    it("hub exposes content action card", () => {
      renderHub();
      const card = screen.getByTestId("hub-action-content");
      expect(card.textContent).toContain("İçerik");
    });

    it("hub exposes publish action card", () => {
      renderHub();
      const card = screen.getByTestId("hub-action-publish");
      expect(card.textContent).toContain("Yayın");
    });

    it("content subtitle is visible in the content section", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      expect(subtitle.textContent).toMatch(/Adım adım rehberlik|Tüm alanları/);
    });

    it("publish subtitle references yonetim paneli for publishing handoff", () => {
      renderAt("/user/publish");
      const subtitle = screen.getByTestId("publish-section-subtitle");
      expect(subtitle.textContent).toContain("yonetim panelinden yayinlanabilir");
    });

    it("content cross-link to publish still works", () => {
      renderAt("/user/content");
      expect(screen.getByTestId("content-to-publish-crosslink")).toBeDefined();
    });

    it("publish cross-link to content still works", () => {
      renderAt("/user/publish");
      expect(screen.getByTestId("publish-to-content-crosslink")).toBeDefined();
    });
  });

  describe("Admin entry what-can-I-do-here clarity", () => {
    it("admin overview subtitle communicates operational scope", () => {
      renderAt("/admin");
      const subtitle = screen.getByTestId("admin-overview-subtitle");
      expect(subtitle.textContent).toContain("Operasyonel gözlem merkezi");
    });

    it("admin overview has quick access heading with testid", () => {
      renderAt("/admin");
      const heading = screen.getByTestId("admin-quick-access-heading");
      expect(heading).toBeDefined();
      expect(heading.textContent).toBe("Hızlı Erişim");
    });

    it("admin quick access cards are present (current label set)", () => {
      renderAt("/admin");
      expect(screen.getByTestId("admin-quick-access-heading")).toBeDefined();
      // Current QUICK_LINKS set: İçerik Kütüphanesi, Yeni Video Oluştur,
      // İşler, Analytics, Kaynaklar, Ayarlar.
      expect(screen.getAllByText("Kaynaklar").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("İşler").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Ayarlar").length).toBeGreaterThanOrEqual(1);
    });

    it("continuity strip communicates admin purpose", () => {
      renderAt("/admin");
      const strip = screen.getByTestId("admin-continuity-strip");
      expect(strip.textContent).toContain("Üretim ve yönetim işlemleri");
    });
  });

  describe("Navigation consistency final pass (F48 short-form)", () => {
    it("header panel switch uses short-form on user side", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Yönetim Paneli");
    });

    it("header panel switch uses short-form on admin side", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Kullanıcı Paneli");
    });

    it("all user routes render without error", () => {
      renderAt("/user");
      expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();

      const { unmount: u1 } = renderAt("/user/content");
      expect(screen.getByRole("heading", { name: "İçerik" })).toBeDefined();
      u1();

      renderAt("/user/publish");
      expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
    });

    it("admin route renders without error", () => {
      renderAt("/admin");
      expect(screen.getByRole("heading", { name: "Yönetim Paneli" })).toBeDefined();
      expect(screen.getByTestId("admin-overview-subtitle")).toBeDefined();
      expect(screen.getByTestId("admin-continuity-strip")).toBeDefined();
    });

    it("sidebar navigation items present on user side", () => {
      renderAt("/user");
      expect(screen.getAllByRole("link", { name: "Anasayfa" }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole("link", { name: "İçerik" }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole("link", { name: "Yayın" }).length).toBeGreaterThanOrEqual(1);
    });
  });
});
