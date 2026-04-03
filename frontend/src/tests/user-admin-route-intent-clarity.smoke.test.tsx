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
    it("dashboard subtitle identifies user panel as baslangic ve takip merkezi", async () => {
      renderAt("/user");
      const note = await screen.findByTestId("dashboard-context-note");
      expect(note.textContent).toContain("Baslangic ve takip merkezi");
    });

    it("dashboard subtitle references yonetim paneli for detailed operations", async () => {
      renderAt("/user");
      const note = await screen.findByTestId("dashboard-context-note");
      expect(note.textContent).toContain("yonetim paneline gecebilirsiniz");
    });

    it("content section keeps its production identity", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      expect(subtitle.textContent).toContain("Icerik uretim merkezi");
    });

    it("publish section keeps its distribution identity", () => {
      renderAt("/user/publish");
      const subtitle = screen.getByTestId("publish-section-subtitle");
      expect(subtitle.textContent).toContain("Yayin ve dagitim merkezi");
    });
  });

  describe("admin panel intent", () => {
    it("admin overview subtitle identifies admin as uretim ve yonetim merkezi", () => {
      renderAt("/admin");
      const subtitle = screen.getByTestId("admin-overview-subtitle");
      expect(subtitle.textContent).toContain("Uretim ve yonetim merkezi");
    });

    it("admin overview subtitle references kullanici paneli for baslangic/takip", () => {
      renderAt("/admin");
      const subtitle = screen.getByTestId("admin-overview-subtitle");
      expect(subtitle.textContent).toContain("kullanici panelini kullanabilirsiniz");
    });

    it("continuity strip communicates admin intent", () => {
      renderAt("/admin");
      const strip = screen.getByTestId("admin-continuity-strip");
      expect(strip.textContent).toContain("Uretim ve yonetim islemleri");
    });
  });

  describe("panel switch and continuity unaffected", () => {
    it("user panel switch still targets admin", () => {
      renderAt("/user");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Yonetim Paneline Gec");
    });

    it("admin panel switch still targets user", () => {
      renderAt("/admin");
      const btn = screen.getByTestId("header-panel-switch");
      expect(btn.textContent).toBe("Kullanici Paneline Gec");
    });

    it("continuity strip back link still works", () => {
      renderAt("/admin");
      const backBtn = screen.getByTestId("continuity-back-to-user");
      expect(backBtn.textContent).toBe("Kullanici Paneline Don");
    });

    it("dashboard action hub still present", async () => {
      renderAt("/user");
      expect(await screen.findByTestId("dashboard-action-hub")).toBeDefined();
    });
  });
});
