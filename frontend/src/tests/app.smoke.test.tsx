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
    expect(screen.getByRole("heading", { name: "Anasayfa" })).toBeDefined();
    expect(screen.getByText("ContentHub")).toBeDefined();
  });

  it("renders admin overview at /admin", () => {
    renderAt("/admin");
    expect(screen.getByRole("heading", { name: "Genel Bakis" })).toBeDefined();
    expect(screen.getByText("ContentHub")).toBeDefined();
  });

  it("user shell shows header with Kullanici Paneli label", () => {
    renderAt("/user");
    expect(screen.getByText("Kullanici Paneli")).toBeDefined();
  });

  it("admin shell shows header with Yonetim Paneli label", () => {
    renderAt("/admin");
    expect(screen.getByText("Yonetim Paneli")).toBeDefined();
  });

  it("header shows panel switch button with destination clarity", () => {
    renderAt("/user");
    const btn = screen.getByTestId("header-panel-switch");
    expect(btn).toBeDefined();
    expect(btn.textContent).toBe("Yonetim Paneline Gec");
    expect(btn.getAttribute("title")).toBe("Yonetim paneline gecis yapin");
  });

  it("admin header shows switch to user panel with destination clarity", () => {
    renderAt("/admin");
    const btn = screen.getByTestId("header-panel-switch");
    expect(btn.textContent).toBe("Kullanici Paneline Gec");
    expect(btn.getAttribute("title")).toBe("Kullanici paneline gecis yapin");
  });

  it("admin sidebar shows section headers", () => {
    renderAt("/admin");
    expect(screen.getByText("Sistem")).toBeDefined();
    expect(screen.getByText("Icerik Uretimi")).toBeDefined();
    expect(screen.getByText("Haber")).toBeDefined();
  });

  it("admin overview shows quick access links", () => {
    renderAt("/admin");
    expect(screen.getByText("Hizli Erisim")).toBeDefined();
    expect(screen.getByText("Yeni Video Olustur")).toBeDefined();
  });
});
