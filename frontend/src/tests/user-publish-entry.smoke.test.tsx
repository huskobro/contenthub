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
  it("renders publish entry page at /user/publish", () => {
    renderAt("/user/publish");
    expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
  });

  it("shows description text", () => {
    renderAt("/user/publish");
    expect(screen.getByText(/yayin durumunu buradan takip/)).toBeDefined();
  });

  it("shows jobs publish card", () => {
    renderAt("/user/publish");
    expect(screen.getByTestId("publish-entry-jobs")).toBeDefined();
    expect(screen.getByText("Isler")).toBeDefined();
    expect(screen.getByText("Isleri Goruntule →")).toBeDefined();
  });

  it("shows standard videos publish card", () => {
    renderAt("/user/publish");
    expect(screen.getByTestId("publish-entry-standard-videos")).toBeDefined();
    expect(screen.getByText("Standart Videolar")).toBeDefined();
    expect(screen.getByText("Videolari Goruntule →")).toBeDefined();
  });

  it("shows news bulletins publish card", () => {
    renderAt("/user/publish");
    expect(screen.getByTestId("publish-entry-news-bulletins")).toBeDefined();
    expect(screen.getByText("Haber Bultenleri")).toBeDefined();
    expect(screen.getByText("Bultenleri Goruntule →")).toBeDefined();
  });

  it("shows admin navigation note", () => {
    renderAt("/user/publish");
    expect(screen.getByText(/yonetim panelinde yurutulmektedir/)).toBeDefined();
  });

  it("sidebar Yayin link is active at /user/publish", () => {
    renderAt("/user/publish");
    const link = screen.getByRole("link", { name: "Yayin" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/user/publish");
  });

  it("sidebar Yayin link is available from dashboard", () => {
    renderAt("/user");
    const link = screen.getByRole("link", { name: "Yayin" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/user/publish");
  });

  it("does not break content entry at /user/content", () => {
    renderAt("/user/content");
    expect(screen.getByRole("heading", { name: "Icerik" })).toBeDefined();
  });

  it("does not break user dashboard at /user", async () => {
    renderAt("/user");
    expect(screen.getByRole("heading", { name: "Anasayfa" })).toBeDefined();
    expect(await screen.findByTestId("post-onboarding-handoff")).toBeDefined();
  });
});
