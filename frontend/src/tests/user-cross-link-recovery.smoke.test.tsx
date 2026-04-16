import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider, MemoryRouter, Routes, Route } from "react-router-dom";
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

// Data-router-based render (no navigation tests — avoids AbortSignal issue)
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

// MemoryRouter-based render for navigation tests (avoids data-router AbortSignal issue)
function renderForNav(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/user" element={<UserLayout />}>
            <Route index element={<UserDashboardPage />} />
            <Route path="content" element={<UserContentEntryPage />} />
            <Route path="publish" element={<UserPublishEntryPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("User panel cross-link recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("content page cross-link to publish", () => {
    it("/user/content shows cross-link to publish — testid exists and text contains Yayın", () => {
      renderAt("/user/content");
      const link = screen.getByTestId("content-to-publish-crosslink");
      expect(link).toBeDefined();
      expect(link.textContent).toContain("Yayın");
    });

    it("cross-link on content page navigates toward publish — publish subtitle testid appears", async () => {
      renderForNav("/user/content");
      const link = screen.getByTestId("content-to-publish-crosslink");
      fireEvent.click(link);
      const subtitle = await screen.findByTestId("publish-section-subtitle");
      expect(subtitle).toBeDefined();
    });
  });

  describe("publish page cross-link to content", () => {
    it("/user/publish shows cross-link to content — testid exists and text contains Icerik", () => {
      renderAt("/user/publish");
      const link = screen.getByTestId("publish-to-content-crosslink");
      expect(link).toBeDefined();
      expect(link.textContent).toContain("Icerik");
    });

    it("cross-link on publish page navigates toward content — content subtitle testid appears", async () => {
      renderForNav("/user/publish");
      const link = screen.getByTestId("publish-to-content-crosslink");
      fireEvent.click(link);
      const subtitle = await screen.findByTestId("content-section-subtitle");
      expect(subtitle).toBeDefined();
    });
  });

  describe("main cards still present after cross-link addition", () => {
    it("standard-video and news-bulletin cards still exist on content page", () => {
      renderAt("/user/content");
      expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
      expect(screen.getByTestId("content-entry-news-bulletin")).toBeDefined();
    });

    it("jobs, standard-videos, news-bulletins cards still exist on publish page", () => {
      renderAt("/user/publish");
      expect(screen.getByTestId("publish-entry-jobs")).toBeDefined();
      expect(screen.getByTestId("publish-entry-standard-videos")).toBeDefined();
      expect(screen.getByTestId("publish-entry-news-bulletins")).toBeDefined();
    });
  });

  describe("sidebar and dashboard unaffected", () => {
    it("sidebar active state unaffected — content NavLink still present in navigation at /user/content", () => {
      renderAt("/user/content");
      const nav = screen.getByRole("navigation");
      expect(nav).toBeDefined();
      // Sidebar + page heading both match "İçerik"; pick the link targeting /user/content.
      const links = screen.getAllByRole("link", { name: "İçerik" });
      const contentLink = links.find((l) => l.getAttribute("href") === "/user/content");
      expect(contentLink).toBeDefined();
      expect(contentLink!.getAttribute("href")).toBe("/user/content");
    });

    it("dashboard still works — /user renders greeting heading", () => {
      renderAt("/user");
      expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    });
  });
});
