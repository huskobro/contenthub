import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { UserLayout } from "../app/layouts/UserLayout";
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

describe("Admin continuity strip", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  it("shows continuity strip on admin pages", () => {
    renderAt("/admin");
    expect(screen.getByTestId("admin-continuity-strip")).toBeDefined();
    expect(screen.getByText(/Üretim ve yönetim işlemleri için yönetim panelindesiniz/)).toBeDefined();
  });

  it("shows back to user panel link (F48 short-form)", () => {
    renderAt("/admin");
    const backBtn = screen.getByTestId("continuity-back-to-user");
    expect(backBtn).toBeDefined();
    expect(backBtn.textContent).toBe("Kullanıcı Paneli");
  });

  it("admin overview page still renders correctly", () => {
    renderAt("/admin");
    // PageShell H1 on AdminOverviewPage = "Yönetim Paneli".
    expect(screen.getByRole("heading", { name: "Yönetim Paneli" })).toBeDefined();
    expect(screen.getByTestId("admin-continuity-strip")).toBeDefined();
  });

  it("does not show continuity strip on user dashboard", () => {
    renderAt("/user");
    // UserDashboardPage H1 = "Hoşgeldin, <displayName>".
    expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    expect(screen.queryByTestId("admin-continuity-strip")).toBeNull();
  });

  it("does not break user content entry", () => {
    renderAt("/user/content");
    expect(screen.getByRole("heading", { name: "İçerik" })).toBeDefined();
    expect(screen.queryByTestId("admin-continuity-strip")).toBeNull();
  });

  it("does not break user publish entry", () => {
    renderAt("/user/publish");
    expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
    expect(screen.queryByTestId("admin-continuity-strip")).toBeNull();
  });

  it("header panel switch still present alongside strip", () => {
    renderAt("/admin");
    expect(screen.getByTestId("header-panel-switch")).toBeDefined();
    expect(screen.getByTestId("admin-continuity-strip")).toBeDefined();
  });
});
