import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider, MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserLayout } from "../app/layouts/UserLayout";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { UserContentEntryPage } from "../pages/UserContentEntryPage";
import { UserPublishEntryPage } from "../pages/UserPublishEntryPage";
import { DashboardActionHub } from "../components/dashboard/DashboardActionHub";

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

// Hub isolated render: component is not mounted in UserDashboardPage in this
// version (pasive), but its content card still carries section-transition
// semantics we want to verify contract-wise.
function renderHub() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardActionHub />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("User panel section transition clarity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  describe("dashboard hub cards (component-isolated)", () => {
    // NOTE: Hub su an UserDashboardPage'e mount edilmiyor. Component kontratini
    // izole render ile dogruluyoruz. Flow narrative (Ilk adim/Sonraki adim)
    // bu surumde simplified copy ile degistirildi.
    it("content card exists with current copy", () => {
      renderHub();
      const card = screen.getByTestId("hub-action-content");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("İçerik Oluştur");
    });

    it("publish card exists with current copy", () => {
      renderHub();
      const card = screen.getByTestId("hub-action-publish");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("Yayın Takibi");
    });
  });

  describe("content to publish transition reference", () => {
    it("content subtitle references flow guidance", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      expect(subtitle.textContent).toMatch(/Adım adım rehberlik|Tüm alanları/);
    });

    it("content cards still present", () => {
      renderAt("/user/content");
      expect(screen.getByTestId("content-entry-standard-video")).toBeDefined();
      expect(screen.getByTestId("content-entry-news-bulletin")).toBeDefined();
    });
  });

  describe("publish content prerequisite reference", () => {
    it("publish subtitle references yonetim panelinden yayinlanabilir", () => {
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
