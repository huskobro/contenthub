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
    it("shows active panel label as Kullanici Paneli", () => {
      renderAt("/user");
      const label = screen.getByTestId("header-area-label");
      expect(label.textContent).toBe("Kullanici Paneli");
    });

    it("switch button says Yonetim Paneline Gec (verb included)", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Yonetim Paneline Gec");
    });

    it("switch button has descriptive title attribute", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.getAttribute("title")).toBe("Yonetim paneline gecis yapin");
    });

    it("switch button has descriptive aria-label", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.getAttribute("aria-label")).toBe("Yonetim paneline gecis yapin");
    });
  });

  describe("admin panel header", () => {
    it("shows active panel label as Yonetim Paneli", () => {
      renderAt("/admin");
      const label = screen.getByTestId("header-area-label");
      expect(label.textContent).toBe("Yonetim Paneli");
    });

    it("switch button says Kullanici Paneline Gec (verb included)", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Kullanici Paneline Gec");
    });

    it("switch button has descriptive title attribute", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.getAttribute("title")).toBe("Kullanici paneline gecis yapin");
    });

    it("switch button has descriptive aria-label", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.getAttribute("aria-label")).toBe("Kullanici paneline gecis yapin");
    });
  });

  describe("continuity and context unaffected", () => {
    it("admin continuity strip still present", () => {
      renderAt("/admin");
      expect(screen.getByTestId("admin-continuity-strip")).toBeDefined();
    });

    it("user dashboard context note still present", async () => {
      renderAt("/user");
      expect(await screen.findByTestId("dashboard-context-note")).toBeDefined();
    });
  });
});
