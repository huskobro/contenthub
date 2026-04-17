import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserLayout } from "../app/layouts/UserLayout";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { UserPublishEntryPage } from "../pages/_scaffolds/UserPublishEntryPage";
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
        path: "/user",
        element: <UserLayout />,
        children: [
          { index: true, element: <UserDashboardPage /> },
          { path: "content", element: <UserContentEntryPage /> },
          { path: "publish", element: <UserPublishEntryPage /> },
        ],
      },
      { path: "/admin", element: <div data-testid="admin-page">Admin</div> },
    ],
    { initialEntries: [path] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function renderHub() {
  return render(
    <MemoryRouter>
      <DashboardActionHub />
    </MemoryRouter>
  );
}

describe("Dashboard action hub", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  // NOTE: DashboardActionHub, bu surumde UserDashboardPage icinde default mount
  // edilmiyor. Component seviyesinde contract'ini dogruluyoruz.
  it("shows action hub with Hızlı Erişim header", () => {
    renderHub();
    expect(screen.getByTestId("dashboard-action-hub")).toBeDefined();
    expect(screen.getAllByText("Hızlı Erişim").length).toBeGreaterThanOrEqual(1);
  });

  it("shows content action card with correct label", () => {
    renderHub();
    const card = screen.getByTestId("hub-action-content");
    expect(card).toBeDefined();
    // HUB_ENTRIES[0].title = "İçerik Oluştur", cta = "İçeriğe Git"
    expect(card.textContent).toContain("İçerik Oluştur");
  });

  it("shows publish action card with correct label", () => {
    renderHub();
    const card = screen.getByTestId("hub-action-publish");
    expect(card).toBeDefined();
    // HUB_ENTRIES[1].title = "Yayın Takibi"
    expect(card.textContent).toContain("Yayın Takibi");
  });

  it("shows admin panel action card with correct label", () => {
    renderHub();
    const card = screen.getByTestId("hub-action-admin");
    expect(card).toBeDefined();
    // HUB_ENTRIES[2].title = "Yönetim Paneli"
    expect(card.textContent).toContain("Yönetim Paneli");
  });

  it("dashboard renders with greeting header on /user", () => {
    renderAt("/user");
    // DashboardActionHub suruye entegre degil; sayfa yine de rendersiz hata
    // vermeden cikisliyor (greeting, Kurulum bekliyor banner'i asenkron
    // switch'lenir). Kontrat: heading her zaman var.
    expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
  });

  it("does not break content entry at /user/content", () => {
    renderAt("/user/content");
    expect(screen.getByRole("heading", { name: "İçerik" })).toBeDefined();
  });

  it("does not break publish entry at /user/publish", () => {
    renderAt("/user/publish");
    expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
  });
});
