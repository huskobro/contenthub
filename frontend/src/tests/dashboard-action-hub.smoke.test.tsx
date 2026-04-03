import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

describe("Dashboard action hub", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  it("shows action hub on completed onboarding dashboard", async () => {
    renderAt("/user");
    expect(await screen.findByTestId("dashboard-action-hub")).toBeDefined();
    expect(screen.getByText("Hizli Erisim")).toBeDefined();
  });

  it("shows content action card with correct link", async () => {
    renderAt("/user");
    await screen.findByTestId("dashboard-action-hub");
    const card = screen.getByTestId("hub-action-content");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Icerik");
    expect(card.textContent).toContain("Icerige Git");
  });

  it("shows publish action card with correct link", async () => {
    renderAt("/user");
    await screen.findByTestId("dashboard-action-hub");
    const card = screen.getByTestId("hub-action-publish");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Yayin");
    expect(card.textContent).toContain("Yayina Git");
  });

  it("shows admin panel action card with correct link", async () => {
    renderAt("/user");
    await screen.findByTestId("dashboard-action-hub");
    const card = screen.getByTestId("hub-action-admin");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Yonetim Paneli");
    expect(card.textContent).toContain("Yonetim Paneline Git");
  });

  it("does not show action hub when onboarding is incomplete", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    renderAt("/user");
    expect(screen.queryByTestId("dashboard-action-hub")).toBeNull();
    expect(screen.getByText(/ContentHub'a hosgeldiniz/)).toBeDefined();
  });

  it("handoff card still visible alongside action hub", async () => {
    renderAt("/user");
    expect(await screen.findByTestId("post-onboarding-handoff")).toBeDefined();
    expect(screen.getByTestId("dashboard-action-hub")).toBeDefined();
  });

  it("does not break content entry at /user/content", () => {
    renderAt("/user/content");
    expect(screen.getByRole("heading", { name: "Icerik" })).toBeDefined();
  });

  it("does not break publish entry at /user/publish", () => {
    renderAt("/user/publish");
    expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
  });
});
