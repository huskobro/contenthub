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
  const testRouter = createMemoryRouter(
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
      <RouterProvider router={testRouter} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
});

describe("Panel shell smoke tests", () => {
  it("renders user dashboard at /user", () => {
    renderAt("/user");
    // UserDashboardPage H1 = `Hoşgeldin, ${displayName}` (PageShell title).
    expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    expect(screen.getByText("ContentHub")).toBeDefined();
  });

  it("renders admin overview at /admin", () => {
    renderAt("/admin");
    // AdminOverviewPage H1 = "Yönetim Paneli" (PageShell title).
    expect(
      screen.getByRole("heading", { name: "Yönetim Paneli" }),
    ).toBeDefined();
    expect(screen.getByText("ContentHub")).toBeDefined();
  });

  it("user shell shows header with Kullanıcı Paneli label", () => {
    renderAt("/user");
    // AppHeader panel badge — user mode aktif label.
    expect(screen.getAllByText("Kullanıcı Paneli").length).toBeGreaterThanOrEqual(1);
  });

  it("admin shell shows header with Yönetim Paneli label", () => {
    renderAt("/admin");
    expect(screen.getAllByText("Yönetim Paneli").length).toBeGreaterThanOrEqual(1);
  });

  it("header shows panel switch button to opposite panel", () => {
    renderAt("/user");
    const btn = screen.getByTestId("header-panel-switch");
    expect(btn).toBeDefined();
    // F48 standardizasyonu: kisa panel adi, fiil yok.
    expect(btn.textContent).toBe("Yönetim Paneli");
    expect(btn.getAttribute("title")).toBe("Yönetim Paneli");
  });

  it("admin header shows switch to user panel", () => {
    renderAt("/admin");
    const btn = screen.getByTestId("header-panel-switch");
    expect(btn.textContent).toBe("Kullanıcı Paneli");
    expect(btn.getAttribute("title")).toBe("Kullanıcı Paneli");
  });

  it("admin sidebar shows section headers", () => {
    renderAt("/admin");
    expect(screen.getByText("Sistem")).toBeDefined();
    expect(screen.getAllByText("İçerik Üretimi").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Haber")).toBeDefined();
  });

  it("admin overview shows quick access links", () => {
    renderAt("/admin");
    expect(screen.getByText("Hızlı Erişim")).toBeDefined();
    expect(screen.getByText("Yeni Video Oluştur")).toBeDefined();
  });
});
