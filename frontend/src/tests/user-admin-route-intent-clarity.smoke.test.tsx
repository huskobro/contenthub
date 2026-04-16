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

describe("User/admin route intent clarity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("user panel intent", () => {
    it("dashboard uses user-oriented 'Hoşgeldin' greeting as identity", () => {
      renderAt("/user");
      expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    });

    it("dashboard subtitle identifies user panel as 'Kullanıcı kontrol paneli'", () => {
      renderAt("/user");
      const subtitle = screen.getByTestId("dashboard-subtitle");
      expect(subtitle.textContent).toContain("Kullanıcı kontrol paneli");
    });

    it("content section keeps its production identity", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      // UserContentEntryPage has toggleable text; default (guided) is Turkish.
      expect(subtitle.textContent).toMatch(/Adım adım rehberlik|Tüm alanları/);
    });

    it("publish section keeps its distribution identity", () => {
      renderAt("/user/publish");
      const subtitle = screen.getByTestId("publish-section-subtitle");
      // Not yet retrofitted to full Turkish — keep ASCII match for now.
      expect(subtitle.textContent).toContain("Icerik yayin durumunu takip edin");
    });
  });

  describe("admin panel intent", () => {
    it("admin overview subtitle identifies admin as operational center", () => {
      renderAt("/admin");
      const subtitle = screen.getByTestId("admin-overview-subtitle");
      expect(subtitle.textContent).toContain("Operasyonel gözlem merkezi");
    });

    it("continuity strip communicates admin intent", () => {
      renderAt("/admin");
      const strip = screen.getByTestId("admin-continuity-strip");
      expect(strip.textContent).toContain("Üretim ve yönetim işlemleri");
    });
  });

  describe("panel switch and continuity unaffected", () => {
    // F48 standardizasyonu: switch button kısa panel adı (fiil yok).
    it("user panel switch still targets admin", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Yönetim Paneli");
    });

    it("admin panel switch still targets user", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Kullanıcı Paneli");
    });

    it("continuity strip back link still works", () => {
      renderAt("/admin");
      const backBtn = screen.getByTestId("continuity-back-to-user");
      expect(backBtn.textContent).toBe("Kullanıcı Paneli");
    });
  });
});
