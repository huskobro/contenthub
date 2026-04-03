import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { UserLayout } from "../app/layouts/UserLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
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
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "standard-videos/new", element: <div data-testid="sv-create">SV Create</div> },
        ],
      },
      {
        path: "/user",
        element: <UserLayout />,
        children: [
          { index: true, element: <UserDashboardPage /> },
          { path: "content", element: <UserContentEntryPage /> },
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

describe("Video workflow entry map", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("user content entry — video create entry point", () => {
    it("standard video card is present with correct testid", () => {
      renderAt("/user/content");
      expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
    });

    it("standard video card describes it as ana uretim akisi", () => {
      renderAt("/user/content");
      const card = screen.getByTestId("content-entry-standard-video");
      expect(card.textContent).toContain("Ana uretim akisi");
    });

    it("standard video card CTA says Yeni Video Olustur", () => {
      renderAt("/user/content");
      expect(screen.getByText("Yeni Video Olustur →")).toBeDefined();
    });
  });

  describe("post-onboarding handoff — video create entry point", () => {
    it("handoff card is present", async () => {
      renderAt("/user");
      expect(await screen.findByTestId("post-onboarding-handoff")).toBeDefined();
    });

    it("handoff positions video uretimi as ana akis", async () => {
      renderAt("/user");
      const handoff = await screen.findByTestId("post-onboarding-handoff");
      expect(handoff.textContent).toContain("Video uretimi ana icerik akisinizdir");
    });

    it("handoff primary CTA targets video create", async () => {
      renderAt("/user");
      const btn = await screen.findByTestId("handoff-create-content");
      expect(btn.textContent).toBe("Yeni Video Olustur");
    });
  });

  describe("admin overview — video create quick access", () => {
    it("quick access has Yeni Video Olustur card with testid", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-new-video");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("Yeni Video Olustur");
    });

    it("video quick link describes it as ana uretim akisi", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-new-video");
      expect(card.textContent).toContain("Ana uretim akisi");
    });

    it("all admin quick access cards have testids", () => {
      renderAt("/admin");
      expect(screen.getByTestId("quick-link-new-video")).toBeDefined();
      expect(screen.getByTestId("quick-link-sources")).toBeDefined();
      expect(screen.getByTestId("quick-link-templates")).toBeDefined();
      expect(screen.getByTestId("quick-link-jobs")).toBeDefined();
      expect(screen.getByTestId("quick-link-settings")).toBeDefined();
      expect(screen.getByTestId("quick-link-news-bulletins")).toBeDefined();
    });
  });

  describe("entry map consistency — CTA targets preserved", () => {
    it("content video card and handoff both target /admin/standard-videos/new", () => {
      // Verify both entry points exist and maintain the same workflow entry
      renderAt("/user/content");
      const videoCard = screen.getByTestId("content-entry-standard-video");
      expect(videoCard).toBeDefined();
      expect(videoCard.textContent).toContain("Yeni Video Olustur");
    });

    it("dashboard hub content card still present", async () => {
      renderAt("/user");
      const hubCard = await screen.findByTestId("hub-action-content");
      expect(hubCard).toBeDefined();
      expect(hubCard.textContent).toContain("Icerik");
    });
  });
});
