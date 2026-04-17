import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserLayout } from "../app/layouts/UserLayout";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { UserPublishEntryPage } from "../pages/_scaffolds/UserPublishEntryPage";

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

describe("User publish entry surface", () => {
  // NOTE: UserPublishEntryPage artik router'da dogrudan mount edilmiyor
  // (prod router'da /user/publish -> UserPublishPage). Burada bu sayfa
  // smoke test kapsami icin mount ediliyor ve guncel icerik dogrulaniyor.

  it("renders publish entry page at /user/publish", () => {
    renderAt("/user/publish");
    expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
  });

  it("shows description text", () => {
    renderAt("/user/publish");
    expect(screen.getByText(/Icerik yayin durumunu takip edin/)).toBeDefined();
  });

  it("shows projelerim publish card", () => {
    renderAt("/user/publish");
    const card = screen.getByTestId("publish-entry-jobs");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Projelerim");
  });

  it("shows yeni video publish card", () => {
    renderAt("/user/publish");
    const card = screen.getByTestId("publish-entry-standard-videos");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Yeni Video");
  });

  it("shows yayin kayitlari publish card", () => {
    renderAt("/user/publish");
    const card = screen.getByTestId("publish-entry-news-bulletins");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Yayin Kayitlari");
  });

  it("shows admin navigation note", () => {
    renderAt("/user/publish");
    expect(screen.getByText(/Tamamlanan isler yonetim panelinden yayinlanabilir/)).toBeDefined();
  });

  it("sidebar Yayın link is active at /user/publish", () => {
    renderAt("/user/publish");
    // Sidebar ve H2 baslik ayni isme sahip olabilir; href filtresiyle tek link cek.
    const links = screen.getAllByRole("link", { name: "Yayın" });
    const link = links.find((l) => l.getAttribute("href") === "/user/publish");
    expect(link).toBeDefined();
    expect(link!.getAttribute("aria-current")).toBe("page");
  });

  it("sidebar Yayın link is available from dashboard", () => {
    renderAt("/user");
    const link = screen.getByRole("link", { name: "Yayın" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/user/publish");
  });

  it("does not break content entry at /user/content", () => {
    renderAt("/user/content");
    expect(screen.getByRole("heading", { name: "İçerik" })).toBeDefined();
  });

  it("does not break user dashboard at /user", () => {
    renderAt("/user");
    expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
  });
});
