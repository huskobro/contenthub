import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserLayout } from "../app/layouts/UserLayout";
import { UserDashboardPage } from "../pages/UserDashboardPage";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";

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

function renderHandoff() {
  return render(
    <MemoryRouter>
      <PostOnboardingHandoff />
    </MemoryRouter>
  );
}

describe("Post-onboarding handoff", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // NOTE: PostOnboardingHandoff bu surumde UserDashboardPage'den pasife
  // alindi (import korunuyor). Kontrat component seviyesinde dogrulaniyor.

  it("shows handoff card with Sistem Hazır badge", () => {
    renderHandoff();
    expect(screen.getByTestId("post-onboarding-handoff")).toBeDefined();
    expect(screen.getByText("Sistem Hazir")).toBeDefined();
    expect(screen.getByText("Ilk Iceriginizi Olusturun")).toBeDefined();
  });

  it("primary CTA is present and clickable", () => {
    renderHandoff();
    const btn = screen.getByTestId("handoff-create-content");
    expect(btn.textContent).toBe("Yeni Video Olustur");
    expect(btn.tagName).toBe("BUTTON");
  });

  it("secondary CTA is present and clickable", () => {
    renderHandoff();
    const btn = screen.getByTestId("handoff-go-admin");
    expect(btn.textContent).toBe("Yonetim Paneline Git");
    expect(btn.tagName).toBe("BUTTON");
  });

  it("handoff is NOT mounted on dashboard by default (pasife alindi)", async () => {
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    renderDashboard();
    // Component pasife alindi — dashboard'da gorunmemeli.
    expect(screen.queryByTestId("post-onboarding-handoff")).toBeNull();
  });

  it("shows generic welcome when onboarding is still required", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    renderDashboard();
    expect(screen.queryByTestId("post-onboarding-handoff")).toBeNull();
    expect(screen.getByText(/ContentHub'a hoşgeldiniz/)).toBeDefined();
  });

  it("dashboard heading still rendered", () => {
    window.fetch = mockFetch({ onboarding_required: false, completed_at: "2026-04-03T10:00:00Z" });
    renderDashboard();
    expect(screen.getByRole("heading", { name: /Hoşgeldin/ })).toBeDefined();
  });

  it("shows generic welcome when status fetch fails", () => {
    window.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as unknown as typeof window.fetch;
    renderDashboard();
    expect(screen.queryByTestId("post-onboarding-handoff")).toBeNull();
    expect(screen.getByText(/ContentHub'a hoşgeldiniz/)).toBeDefined();
  });
});
