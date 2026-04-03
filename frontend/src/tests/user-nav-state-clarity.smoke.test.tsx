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

  describe("dashboard section identity", () => {
    it("shows Anasayfa heading", async () => {
      renderAt("/user");
      expect(screen.getByRole("heading", { name: "Anasayfa" })).toBeDefined();
    });

    it("shows section identity in context note", async () => {
      renderAt("/user");
      const note = await screen.findByTestId("dashboard-context-note");
      expect(note.textContent).toContain("Baslangic ve takip merkezi");
    });

    it("sidebar Anasayfa link is active", () => {
      renderAt("/user");
      const link = screen.getByRole("link", { name: "Anasayfa" });
      expect(link.getAttribute("href")).toBe("/user");
      expect(link.getAttribute("aria-current")).toBe("page");
    });
  });

  describe("content section identity", () => {
    it("shows Icerik heading", () => {
      renderAt("/user/content");
      expect(screen.getByRole("heading", { name: "Icerik" })).toBeDefined();
    });

    it("shows section identity in subtitle", () => {
      renderAt("/user/content");
      const subtitle = screen.getByTestId("content-section-subtitle");
      expect(subtitle.textContent).toContain("Icerik uretim merkezi");
    });

    it("sidebar Icerik link is active", () => {
      renderAt("/user/content");
      const link = screen.getByRole("link", { name: "Icerik" });
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
      expect(subtitle.textContent).toContain("Yayin ve dagitim merkezi");
    });

    it("sidebar Yayin link is active", () => {
      renderAt("/user/publish");
      const link = screen.getByRole("link", { name: "Yayin" });
      expect(link.getAttribute("href")).toBe("/user/publish");
      expect(link.getAttribute("aria-current")).toBe("page");
    });
  });
});
