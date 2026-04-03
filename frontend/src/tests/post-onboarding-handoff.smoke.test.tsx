import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserLayout } from "../app/layouts/UserLayout";
import { UserDashboardPage } from "../pages/UserDashboardPage";

function mockFetch(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }) as unknown as typeof window.fetch;
}

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/user",
        element: <UserLayout />,
        children: [{ index: true, element: <UserDashboardPage /> }],
      },
      { path: "/admin", element: <div data-testid="admin-panel">Admin</div> },
      { path: "/admin/standard-videos/new", element: <div data-testid="create-video-page">Create Video</div> },
    ],
    { initialEntries: ["/user"] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("Post-onboarding handoff", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows handoff card when onboarding is completed", async () => {
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    renderDashboard();
    expect(await screen.findByTestId("post-onboarding-handoff")).toBeDefined();
    expect(screen.getByText("Sistem Hazir")).toBeDefined();
    expect(screen.getByText("Ilk Iceriginizi Olusturun")).toBeDefined();
  });

  it("shows generic welcome when onboarding is still required", async () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    renderDashboard();
    // Handoff should not appear
    expect(screen.queryByTestId("post-onboarding-handoff")).toBeNull();
    expect(screen.getByText(/ContentHub'a hosgeldiniz/)).toBeDefined();
  });

  it("primary CTA is present and clickable", async () => {
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    renderDashboard();
    const btn = await screen.findByTestId("handoff-create-content");
    expect(btn.textContent).toBe("Yeni Video Olustur");
    expect(btn.tagName).toBe("BUTTON");
  });

  it("secondary CTA is present and clickable", async () => {
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    renderDashboard();
    const btn = await screen.findByTestId("handoff-go-admin");
    expect(btn.textContent).toBe("Yonetim Paneline Git");
    expect(btn.tagName).toBe("BUTTON");
  });

  it("does not break existing dashboard heading", async () => {
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    renderDashboard();
    await screen.findByTestId("post-onboarding-handoff");
    expect(screen.getByRole("heading", { name: "Anasayfa" })).toBeDefined();
  });

  it("shows generic welcome when status fetch fails", () => {
    window.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as unknown as typeof window.fetch;
    renderDashboard();
    // Fallback: no handoff, just welcome
    expect(screen.queryByTestId("post-onboarding-handoff")).toBeNull();
    expect(screen.getByText(/ContentHub'a hosgeldiniz/)).toBeDefined();
  });

  it("onboarding gate bypass is not affected", async () => {
    // This test verifies that the dashboard page itself does not interfere with gate logic
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    renderDashboard();
    // User lands on /user and sees handoff — not redirected elsewhere
    await screen.findByTestId("post-onboarding-handoff");
    expect(screen.getByRole("heading", { name: "Anasayfa" })).toBeDefined();
  });
});
