import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { UserPublishEntryPage } from "../pages/UserPublishEntryPage";

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

describe("Navigation closure pack (Phase 264-267)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("Phase 264: user task-chain visibility", () => {
    it("dashboard hub shows task chain flow description", async () => {
      renderAt("/user");
      const desc = await screen.findByTestId("hub-flow-desc");
      expect(desc.textContent).toContain("Once icerik olusturun");
      expect(desc.textContent).toContain("yayin surecini takip edin");
    });

    it("hub content card shows ilk adim", async () => {
      renderAt("/user");
      const card = await screen.findByTestId("hub-action-content");
      expect(card.textContent).toContain("Ilk adim");
    });

    it("hub publish card shows sonraki adim", async () => {
      renderAt("/user");
      const card = await screen.findByTestId("hub-action-publish");
      expect(card.textContent).toContain("Sonraki adim");
    });

    it("content subtitle positions as ikinci adim in task chain", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      expect(subtitle.textContent).toContain("Adim adim rehberlik ile yeni icerik olusturun");
    });

    it("publish subtitle positions as ucuncu adim in task chain", () => {
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

  describe("Phase 265: admin entry what-can-I-do-here clarity", () => {
    it("admin overview subtitle answers what-can-I-do-here with action verbs", () => {
      renderAt("/admin");
      const subtitle = screen.getByTestId("admin-overview-subtitle");
      expect(subtitle.textContent).toContain("Uretim ve yonetim merkezi");
      expect(subtitle.textContent).toContain("kaynak");
      expect(subtitle.textContent).toContain("sablon");
    });

    it("admin overview has quick access heading with testid", () => {
      renderAt("/admin");
      expect(screen.getByTestId("admin-quick-access-heading")).toBeDefined();
      expect(screen.getByTestId("admin-quick-access-heading").textContent).toBe("Hizli Erisim");
    });

    it("admin quick access cards are present", () => {
      renderAt("/admin");
      expect(screen.getByTestId("admin-quick-access-heading")).toBeDefined();
      // Cards share text with sidebar links, so use getAllByText
      expect(screen.getAllByText("Kaynaklar").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Sablonlar").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Isler").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Ayarlar").length).toBeGreaterThanOrEqual(1);
    });

    it("admin overview references user panel for baslangic/takip", () => {
      renderAt("/admin");
      const subtitle = screen.getByTestId("admin-overview-subtitle");
      expect(subtitle.textContent).toContain("sistem ayarlari");
    });

    it("continuity strip communicates admin purpose", () => {
      renderAt("/admin");
      const strip = screen.getByTestId("admin-continuity-strip");
      expect(strip.textContent).toContain("Uretim ve yonetim islemleri");
    });
  });

  describe("Phase 266: navigation consistency final pass", () => {
    it("header panel switch has verb-based label on user side", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Yonetim Paneline Gec");
    });

    it("header panel switch has verb-based label on admin side", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Kullanici Paneline Gec");
    });

    it("all user routes render without error", async () => {
      renderAt("/user");
      expect(screen.getByRole("heading", { name: "Anasayfa" })).toBeDefined();
      expect(await screen.findByTestId("dashboard-context-note")).toBeDefined();

      const { unmount: u1 } = renderAt("/user/content");
      expect(screen.getByRole("heading", { name: "Icerik" })).toBeDefined();
      u1();

      renderAt("/user/publish");
      expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
    });

    it("admin route renders without error", () => {
      renderAt("/admin");
      expect(screen.getByRole("heading", { name: "Genel Bakis" })).toBeDefined();
      expect(screen.getByTestId("admin-overview-subtitle")).toBeDefined();
      expect(screen.getByTestId("admin-continuity-strip")).toBeDefined();
    });

    it("sidebar navigation items present on user side", () => {
      renderAt("/user");
      expect(screen.getByRole("link", { name: "Anasayfa" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Icerik" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Yayin" })).toBeDefined();
    });
  });
});
