import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserLayout } from "../app/layouts/UserLayout";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";

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
        ],
      },
      { path: "/admin/standard-videos/new", element: <div data-testid="sv-create">SV Create</div> },
      { path: "/admin/news-bulletins/new", element: <div data-testid="nb-create">NB Create</div> },
    ],
    { initialEntries: [path] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
});

describe("User content entry surface", () => {
  it("renders content entry page at /user/content", () => {
    renderAt("/user/content");
    expect(screen.getByRole("heading", { name: "Icerik" })).toBeDefined();
  });

  it("shows description text", () => {
    renderAt("/user/content");
    expect(screen.getByText(/Icerik uretim merkezi/)).toBeDefined();
  });

  it("shows standard video content card", () => {
    renderAt("/user/content");
    expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
    expect(screen.getByText("Standart Video")).toBeDefined();
    expect(screen.getByText("Yeni Video Olustur →")).toBeDefined();
  });

  it("shows news bulletin content card", () => {
    renderAt("/user/content");
    expect(screen.getByTestId("content-entry-news-bulletin")).toBeDefined();
    expect(screen.getByText("Haber Bulteni")).toBeDefined();
    expect(screen.getByText("Yeni Bulten Olustur →")).toBeDefined();
  });

  it("shows admin navigation note", () => {
    renderAt("/user/content");
    expect(screen.getByText(/yonetim panelinde calismaktadir/)).toBeDefined();
  });

  it("sidebar Icerik link is active at /user/content", () => {
    renderAt("/user/content");
    const link = screen.getByRole("link", { name: "Icerik" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/user/content");
  });

  it("sidebar Icerik link is available from dashboard", () => {
    renderAt("/user");
    const link = screen.getByRole("link", { name: "Icerik" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/user/content");
  });

  it("does not break user dashboard at /user", async () => {
    renderAt("/user");
    expect(screen.getByRole("heading", { name: "Anasayfa" })).toBeDefined();
    expect(await screen.findByTestId("post-onboarding-handoff")).toBeDefined();
  });
});
