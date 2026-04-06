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

describe("User panel section transition clarity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("dashboard hub flow description", () => {
    it("shows flow-aware hub description", async () => {
      renderAt("/user");
      const desc = await screen.findByTestId("hub-flow-desc");
      expect(desc.textContent).toContain("Once icerik olusturun");
      expect(desc.textContent).toContain("yayin surecini takip edin");
    });

    it("content card hints at first step", async () => {
      renderAt("/user");
      const card = await screen.findByTestId("hub-action-content");
      expect(card.textContent).toContain("Ilk adim");
    });

    it("publish card hints at next step", async () => {
      renderAt("/user");
      const card = await screen.findByTestId("hub-action-publish");
      expect(card.textContent).toContain("Sonraki adim");
    });
  });

  describe("content to publish transition reference", () => {
    it("content subtitle references Yayin as next step", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      expect(subtitle.textContent).toContain("Adim adim rehberlik ile yeni icerik olusturun");
    });

    it("content cards still present", () => {
      renderAt("/user/content");
      expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
      expect(screen.getByTestId("content-entry-news-bulletin")).toBeDefined();
    });
  });

  describe("publish content prerequisite reference", () => {
    it("publish subtitle references Icerik as source", () => {
      renderAt("/user/publish");
      const subtitle = screen.getByTestId("publish-section-subtitle");
      expect(subtitle.textContent).toContain("yonetim panelinden yayinlanabilir");
    });

    it("publish first-use note maintains content prerequisite", () => {
      renderAt("/user/publish");
      const note = screen.getByTestId("publish-first-use-note");
      expect(note.textContent).toContain("once Icerik ekranindan icerik olusturun");
    });

    it("publish cards still present", () => {
      renderAt("/user/publish");
      expect(screen.getByTestId("publish-entry-jobs")).toBeDefined();
      expect(screen.getByTestId("publish-entry-standard-videos")).toBeDefined();
      expect(screen.getByTestId("publish-entry-news-bulletins")).toBeDefined();
    });
  });
});
