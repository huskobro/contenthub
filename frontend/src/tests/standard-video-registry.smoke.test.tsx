import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StandardVideoRegistryPage } from "../pages/admin/StandardVideoRegistryPage";
import type { StandardVideoResponse } from "../api/standardVideoApi";

const MOCK_VIDEOS: StandardVideoResponse[] = [
  {
    id: "sv1",
    title: "Test Video 1",
    topic: "Yapay Zeka",
    brief: null,
    target_duration_seconds: 120,
    tone: "formal",
    language: "tr",
    visual_direction: "clean",
    subtitle_style: "standard",
    status: "draft",
    job_id: null,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "sv2",
    title: null,
    topic: "İklim Değişikliği",
    brief: "Kısa açıklama",
    target_duration_seconds: null,
    tone: "casual",
    language: "en",
    visual_direction: null,
    subtitle_style: null,
    status: "script_ready",
    job_id: null,
    created_at: "2026-04-01T11:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
  },
];

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function renderRegistry(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/standard-videos", element: <StandardVideoRegistryPage /> }],
    { initialEntries: ["/admin/standard-videos"] }
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Standard Video Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderRegistry(mockFetch(MOCK_VIDEOS));
    expect(screen.getByRole("heading", { name: "Standart Video Kayitlari" })).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/standard-videos", element: <StandardVideoRegistryPage /> }],
      { initialEntries: ["/admin/standard-videos"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("displays video list after data loads", async () => {
    renderRegistry(mockFetch(MOCK_VIDEOS));
    await waitFor(() => {
      expect(screen.getByText("Yapay Zeka")).toBeDefined();
      expect(screen.getByText("İklim Değişikliği")).toBeDefined();
    });
  });

  it("shows empty state when no videos", async () => {
    renderRegistry(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz kayıt yok.")).toBeDefined();
    });
  });

  it("shows error state on fetch failure", async () => {
    window.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/standard-videos", element: <StandardVideoRegistryPage /> }],
      { initialEntries: ["/admin/standard-videos"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Hata/)).toBeDefined();
    });
  });
});
