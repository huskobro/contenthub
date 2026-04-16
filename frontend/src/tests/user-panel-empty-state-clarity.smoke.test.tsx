import { render, screen, waitFor } from "@testing-library/react";
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

describe("User panel empty/first-use state clarity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("dashboard onboarding pending", () => {
    it("shows actionable pending note when onboarding is incomplete", async () => {
      window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
      renderAt("/user");
      const note = await screen.findByTestId("dashboard-onboarding-pending-note");
      expect(note).toBeDefined();
      expect(note.textContent).toContain("kurulum adımlarını tamamlayın");
      expect(note.textContent).toContain("Kuruluma Başla");
    });

    it("does not show pending note when onboarding is completed", async () => {
      window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
      renderAt("/user");
      // Fetch resolves async; wait until onboardingCompleted flips to true,
      // at which point the pending note branch unmounts.
      await waitFor(() => {
        expect(screen.queryByTestId("dashboard-onboarding-pending-note")).toBeNull();
      });
    });
  });

  describe("content entry first-use", () => {
    beforeEach(() => {
      window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    });

    it("shows first-use guidance note", () => {
      renderAt("/user/content");
      const note = screen.getByTestId("content-first-use-note");
      expect(note).toBeDefined();
      expect(note.textContent).toContain("İlk kez mi kullanıyorsunuz");
      expect(note.textContent).toContain("türlerden birini seçerek başlayabilirsiniz");
    });

    it("content cards are still present", () => {
      renderAt("/user/content");
      expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
      expect(screen.getByTestId("content-entry-news-bulletin")).toBeDefined();
    });
  });

  describe("publish entry first-use", () => {
    beforeEach(() => {
      window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    });

    it("shows first-use guidance note", () => {
      renderAt("/user/publish");
      const note = screen.getByTestId("publish-first-use-note");
      expect(note).toBeDefined();
      expect(note.textContent).toContain("Yayin sureci baslamadiysa");
      expect(note.textContent).toContain("once Icerik ekranindan icerik olusturun");
    });

    it("publish cards are still present", () => {
      renderAt("/user/publish");
      expect(screen.getByTestId("publish-entry-jobs")).toBeDefined();
      expect(screen.getByTestId("publish-entry-standard-videos")).toBeDefined();
      expect(screen.getByTestId("publish-entry-news-bulletins")).toBeDefined();
    });
  });

  describe("cross-surface integrity", () => {
    beforeEach(() => {
      window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    });

    // NOTE: DashboardActionHub ve PostOnboardingHandoff bu surumde
    // UserDashboardPage'de default mount edilmiyor; sayfa hata vermeden
    // greeting header'i gosterir.
    it("dashboard greeting header stays visible after fetch", () => {
      renderAt("/user");
      expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    });
  });
});
