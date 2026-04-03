import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnboardingWelcomeScreen } from "../components/onboarding/OnboardingWelcomeScreen";
import { AppEntryGate } from "../app/AppEntryGate";

function mockFetch(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }) as unknown as typeof window.fetch;
}

function renderWelcome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingWelcomeScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderGate(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AppEntryGate />} />
          <Route path="/onboarding" element={<div data-testid="onboarding-screen">Onboarding</div>} />
          <Route path="/user" element={<div data-testid="user-dashboard">User</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("OnboardingWelcomeScreen", () => {
  it("renders the welcome heading", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    renderWelcome();
    expect(screen.getByText("ContentHub'a Hosgeldiniz")).toBeDefined();
  });

  it("renders all three feature cards", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    renderWelcome();
    expect(screen.getByText("Modular Content Production")).toBeDefined();
    expect(screen.getByText("Full Operations Visibility")).toBeDefined();
    expect(screen.getByText("Publish & Analyze")).toBeDefined();
  });

  it("renders the primary CTA button", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    renderWelcome();
    expect(screen.getByText("Kurulumu Baslat")).toBeDefined();
  });

  it("renders the skip button", () => {
    window.fetch = mockFetch({ onboarding_required: true, completed_at: null });
    renderWelcome();
    expect(screen.getByText("Simdilik Atla")).toBeDefined();
  });
});

describe("AppEntryGate", () => {
  it("shows loading state initially", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof window.fetch;
    renderGate(window.fetch);
    expect(screen.getByText("Yukleniyor...")).toBeDefined();
  });

  it("redirects to /onboarding when onboarding is required", async () => {
    renderGate(mockFetch({ onboarding_required: true, completed_at: null }));
    const el = await screen.findByTestId("onboarding-screen");
    expect(el).toBeDefined();
  });

  it("redirects to /user when onboarding is not required", async () => {
    renderGate(mockFetch({ onboarding_required: false, completed_at: "2026-04-03T00:00:00Z" }));
    const el = await screen.findByTestId("user-dashboard");
    expect(el).toBeDefined();
  });
});
