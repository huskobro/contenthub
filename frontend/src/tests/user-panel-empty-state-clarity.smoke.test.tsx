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

describe("User panel empty/first-use state clarity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("dashboard onboarding pending", () => {
    it("shows actionable pending note when onboarding is incomplete", () => {
      window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
      renderAt("/user");
      const note = screen.getByTestId("dashboard-onboarding-pending-note");
      expect(note).toBeDefined();
      expect(note.textContent).toContain("kurulum adimlarini tamamlayin");
      expect(note.textContent).toContain("icerik olusturma");
    });

    it("does not show pending note when onboarding is completed", async () => {
      window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
      renderAt("/user");
      await screen.findByTestId("dashboard-context-note");
      expect(screen.queryByTestId("dashboard-onboarding-pending-note")).toBeNull();
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
      expect(note.textContent).toContain("Henuz icerik olusturmadiyseniz");
      expect(note.textContent).toContain("ilk iceriginizi baslatabilirsiniz");
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
      expect(note.textContent).toContain("Henuz yayin sureci baslamadiysa");
      expect(note.textContent).toContain("once Icerik ekranindan bir icerik olusturun");
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

    it("dashboard action hub still visible", async () => {
      renderAt("/user");
      expect(await screen.findByTestId("dashboard-action-hub")).toBeDefined();
    });

    it("dashboard handoff still visible", async () => {
      renderAt("/user");
      expect(await screen.findByTestId("post-onboarding-handoff")).toBeDefined();
    });
  });
});
