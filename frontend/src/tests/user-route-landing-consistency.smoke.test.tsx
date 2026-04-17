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

describe("User panel route landing consistency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("/user — dashboard landing", () => {
    it("has h1 greeting heading", () => {
      renderAt("/user");
      // PageShell title = `Hoşgeldin, ${displayName}`
      expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    });

    it("has subtitle with testId-derived data-testid", () => {
      renderAt("/user");
      // PageShell renders `${testId}-subtitle` automatically.
      const subtitle = screen.getByTestId("dashboard-subtitle");
      expect(subtitle).toBeDefined();
      expect(subtitle.textContent).toContain("Kullanıcı kontrol paneli");
    });
  });

  describe("/user/content — content landing", () => {
    it("has h2 heading", () => {
      renderAt("/user/content");
      expect(screen.getByRole("heading", { name: "İçerik" })).toBeDefined();
    });

    it("has subtitle with data-testid", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      expect(subtitle).toBeDefined();
      expect(subtitle.textContent).toMatch(/Adım adım rehberlik|Tüm alanları/);
    });

    it("has content cards", () => {
      renderAt("/user/content");
      expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
      expect(screen.getByTestId("content-entry-news-bulletin")).toBeDefined();
    });

    it("has first-use note with data-testid", () => {
      renderAt("/user/content");
      const note = screen.getByTestId("content-first-use-note");
      expect(note).toBeDefined();
      expect(note.textContent).toContain("İlk kez mi kullanıyorsunuz");
    });
  });

  describe("/user/publish — publish landing", () => {
    it("has h2 heading", () => {
      renderAt("/user/publish");
      expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
    });

    it("has subtitle with data-testid", () => {
      renderAt("/user/publish");
      const subtitle = screen.getByTestId("publish-section-subtitle");
      expect(subtitle).toBeDefined();
      expect(subtitle.textContent).toContain("Icerik yayin durumunu takip edin");
    });

    it("has publish cards", () => {
      renderAt("/user/publish");
      expect(screen.getByTestId("publish-entry-jobs")).toBeDefined();
      expect(screen.getByTestId("publish-entry-standard-videos")).toBeDefined();
      expect(screen.getByTestId("publish-entry-news-bulletins")).toBeDefined();
    });

    it("has first-use note with data-testid", () => {
      renderAt("/user/publish");
      const note = screen.getByTestId("publish-first-use-note");
      expect(note).toBeDefined();
      expect(note.textContent).toContain("Yayin sureci baslamadiysa");
    });
  });
});
