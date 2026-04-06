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

describe("Admin to user return landing clarity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  it("shows context note on user dashboard for completed onboarding", async () => {
    renderAt("/user");
    expect(await screen.findByTestId("dashboard-context-note")).toBeDefined();
    expect(screen.getByText(/Icerik akisini baslatin/)).toBeDefined();
  });

  it("context note explains available actions", async () => {
    renderAt("/user");
    const note = await screen.findByTestId("dashboard-context-note");
    expect(note.textContent).toContain("Icerik akisini baslatin");
    expect(note.textContent).toContain("yayin durumunu takip edin");
    expect(note.textContent).toContain("yonetim paneline gecin");
  });

  it("does not show context note when onboarding is incomplete", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    renderAt("/user");
    expect(screen.queryByTestId("dashboard-context-note")).toBeNull();
  });

  it("action hub still visible alongside context note", async () => {
    renderAt("/user");
    expect(await screen.findByTestId("dashboard-context-note")).toBeDefined();
    expect(screen.getByTestId("dashboard-action-hub")).toBeDefined();
  });

  it("handoff card still visible alongside context note", async () => {
    renderAt("/user");
    expect(await screen.findByTestId("dashboard-context-note")).toBeDefined();
    expect(screen.getByTestId("post-onboarding-handoff")).toBeDefined();
  });

  it("continuity strip back link targets user panel", () => {
    renderAt("/admin");
    const backBtn = screen.getByTestId("continuity-back-to-user");
    expect(backBtn).toBeDefined();
    expect(backBtn.textContent).toBe("Kullanici Paneline Don");
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
