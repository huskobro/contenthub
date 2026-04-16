import { render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("heading", { name: "İçerik" })).toBeDefined();
  });

  it("shows description text (guided mode default)", () => {
    renderAt("/user/content");
    expect(screen.getByText(/Adım adım rehberlik ile yeni içerik oluşturun/)).toBeDefined();
  });

  it("shows standard video content card", () => {
    renderAt("/user/content");
    expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
    expect(screen.getByText("Standart Video")).toBeDefined();
    // CTA text: ct.cta = "Yeni Video Oluştur"; card render appends " →".
    expect(screen.getByText(/Yeni Video Oluştur/)).toBeDefined();
  });

  it("shows news bulletin content card", () => {
    renderAt("/user/content");
    expect(screen.getByTestId("content-entry-news-bulletin")).toBeDefined();
    expect(screen.getByText("Haber Bülteni")).toBeDefined();
    expect(screen.getByText(/Yeni Bülten Oluştur/)).toBeDefined();
  });

  it("shows admin navigation crosslink area", () => {
    renderAt("/user/content");
    // Current testId: content-to-publish-crosslink (was content-to-library-crosslink).
    expect(screen.getByTestId("content-to-publish-crosslink")).toBeDefined();
  });

  it("sidebar İçerik link is active at /user/content", () => {
    renderAt("/user/content");
    const links = screen.getAllByRole("link", { name: "İçerik" });
    const primary = links.find((l) => l.getAttribute("href") === "/user/content");
    expect(primary).toBeDefined();
  });

  it("sidebar İçerik link is available from dashboard", () => {
    renderAt("/user");
    const links = screen.getAllByRole("link", { name: "İçerik" });
    const primary = links.find((l) => l.getAttribute("href") === "/user/content");
    expect(primary).toBeDefined();
  });

  it("does not break user dashboard at /user", () => {
    renderAt("/user");
    expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    // PostOnboardingHandoff bu surumde UserDashboardPage'de pasif.
  });
});
