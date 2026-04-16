import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserDashboardPage } from "../pages/UserDashboardPage";

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
        children: [{ index: true, element: <UserDashboardPage /> }],
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

describe("Panel switch destination clarity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("user panel header", () => {
    it("shows active panel label as Kullanıcı Paneli", () => {
      renderAt("/user");
      const label = screen.getByTestId("header-area-label");
      expect(label.textContent).toBe("Kullanıcı Paneli");
    });

    it("switch button says Yönetim Paneli (F48 short-form)", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Yönetim Paneli");
    });

    it("switch button has descriptive title attribute", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.getAttribute("title")).toBe("Yönetim Paneli");
    });

    it("switch button has descriptive aria-label", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.getAttribute("aria-label")).toBe("Yönetim Paneli");
    });
  });

  describe("admin panel header", () => {
    it("shows active panel label as Yönetim Paneli", () => {
      renderAt("/admin");
      const label = screen.getByTestId("header-area-label");
      expect(label.textContent).toBe("Yönetim Paneli");
    });

    it("switch button says Kullanıcı Paneli (F48 short-form)", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Kullanıcı Paneli");
    });

    it("switch button has descriptive title attribute", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.getAttribute("title")).toBe("Kullanıcı Paneli");
    });

    it("switch button has descriptive aria-label", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.getAttribute("aria-label")).toBe("Kullanıcı Paneli");
    });
  });

  describe("continuity and context unaffected", () => {
    it("admin continuity strip still present", () => {
      renderAt("/admin");
      expect(screen.getByTestId("admin-continuity-strip")).toBeDefined();
    });

    it("user dashboard greeting header still present", () => {
      renderAt("/user");
      // dashboard-context-note element bu surumde yok; greeting header
      // her halukarda rendersiz hata vermeden cikislidir.
      expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    });
  });
});
