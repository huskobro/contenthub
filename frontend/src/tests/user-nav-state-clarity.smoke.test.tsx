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

describe("User panel navigation state clarity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
  });

  // Sidebar Anasayfa/İçerik/Yayın etiketleri Turkish; PageShell H1 user
  // dashboard'da greeting template kullanıyor (context-note elementi bu
  // sürumde yok). Kontrat: sidebar link + aria-current + testid vs label.

  function findActiveLink(name: string) {
    const links = screen.getAllByRole("link", { name });
    return links.find((l) => l.getAttribute("aria-current") === "page") ?? links[0];
  }

  describe("dashboard section identity", () => {
    it("shows greeting heading on /user", () => {
      renderAt("/user");
      expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
    });

    it("sidebar Anasayfa link is active", () => {
      renderAt("/user");
      const link = findActiveLink("Anasayfa");
      expect(link.getAttribute("href")).toBe("/user");
      expect(link.getAttribute("aria-current")).toBe("page");
    });
  });

  describe("content section identity", () => {
    it("shows İçerik heading", () => {
      renderAt("/user/content");
      expect(screen.getByRole("heading", { name: "İçerik" })).toBeDefined();
    });

    it("shows section identity in subtitle", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      expect(subtitle.textContent).toMatch(/Adım adım rehberlik|Tüm alanları/);
    });

    it("sidebar İçerik link is active", () => {
      renderAt("/user/content");
      const link = findActiveLink("İçerik");
      expect(link.getAttribute("href")).toBe("/user/content");
      expect(link.getAttribute("aria-current")).toBe("page");
    });
  });

  describe("publish section identity", () => {
    it("shows Yayin heading", () => {
      renderAt("/user/publish");
      expect(screen.getByRole("heading", { name: "Yayin" })).toBeDefined();
    });

    it("shows section identity in subtitle", () => {
      renderAt("/user/publish");
      const subtitle = screen.getByTestId("publish-section-subtitle");
      expect(subtitle.textContent).toContain("Icerik yayin durumunu takip edin");
    });

    it("sidebar Yayın link is active", () => {
      renderAt("/user/publish");
      const link = findActiveLink("Yayın");
      expect(link.getAttribute("href")).toBe("/user/publish");
      expect(link.getAttribute("aria-current")).toBe("page");
    });
  });
});
