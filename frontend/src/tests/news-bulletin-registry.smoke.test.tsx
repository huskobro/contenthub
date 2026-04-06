import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewsBulletinRegistryPage } from "../pages/admin/NewsBulletinRegistryPage";
import type { NewsBulletinResponse } from "../api/newsBulletinApi";

const MOCK_BULLETINS: NewsBulletinResponse[] = [
  {
    id: "bulletin-1",
    title: "Morning Bulletin",
    topic: "Tech News Today",
    brief: "Focus on AI and software",
    target_duration_seconds: 120,
    language: "tr",
    tone: "formal",
    bulletin_style: "studio",
    source_mode: "manual",
    selected_news_ids_json: '["id-1","id-2"]',
    status: "draft",
    job_id: null,
    created_at: "2026-04-02T08:00:00Z",
    updated_at: "2026-04-02T08:00:00Z",
    composition_direction: null,
    thumbnail_direction: null,
    template_id: null,
    style_blueprint_id: null,
  },
  {
    id: "bulletin-2",
    title: null,
    topic: "Finance Update",
    brief: null,
    target_duration_seconds: null,
    language: "en",
    tone: "casual",
    bulletin_style: "futuristic",
    source_mode: "auto",
    selected_news_ids_json: null,
    status: "in_progress",
    job_id: "job-abc",
    created_at: "2026-04-02T09:00:00Z",
    updated_at: "2026-04-02T09:30:00Z",
    composition_direction: null,
    thumbnail_direction: null,
    template_id: null,
    style_blueprint_id: null,
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> }],
    { initialEntries: ["/admin/news-bulletins"] }
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

describe("News Bulletin Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderRegistry(mockFetch(MOCK_BULLETINS));
    expect(screen.getByTestId("nb-registry-heading")).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> }],
      { initialEntries: ["/admin/news-bulletins"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    window.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> }],
      { initialEntries: ["/admin/news-bulletins"] }
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

  it("shows empty state when no bulletins", async () => {
    renderRegistry(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz news bulletin kaydı yok.")).toBeDefined();
    });
  });

  it("displays bulletin list after data loads", async () => {
    renderRegistry(mockFetch(MOCK_BULLETINS));
    await waitFor(() => {
      expect(screen.getByText("Tech News Today")).toBeDefined();
      expect(screen.getByText("Finance Update")).toBeDefined();
    });
  });

  it("shows status column values", async () => {
    renderRegistry(mockFetch(MOCK_BULLETINS));
    await waitFor(() => {
      expect(screen.getByText("draft")).toBeDefined();
      expect(screen.getByText("in_progress")).toBeDefined();
    });
  });

  it("shows no detail panel when nothing is selected", async () => {
    renderRegistry(mockFetch(MOCK_BULLETINS));
    await waitFor(() => {
      expect(screen.getByText("Bir news bulletin seçin.")).toBeDefined();
    });
  });

  it("shows detail panel loading state after selection", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BULLETINS) });
      }
      return new Promise(() => {}); // detail never resolves
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> }],
      { initialEntries: ["/admin/news-bulletins"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Tech News Today")).toBeDefined());
    await user.click(screen.getByText("Tech News Today"));
    await waitFor(() => {
      expect(screen.getByText("Yükleniyor...")).toBeDefined();
    });
  });

  it("shows detail panel data after selecting a bulletin", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BULLETINS) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BULLETINS[0]) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> }],
      { initialEntries: ["/admin/news-bulletins"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Tech News Today")).toBeDefined());
    await user.click(screen.getByText("Tech News Today"));
    await waitFor(() => {
      expect(screen.getByTestId("nb-detail-heading")).toBeDefined();
    });
  });
});
