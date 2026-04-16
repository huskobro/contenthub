import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SourcesRegistryPage } from "../pages/admin/SourcesRegistryPage";
import type { SourceResponse } from "../api/sourcesApi";

const MOCK_SOURCES: SourceResponse[] = [
  {
    id: "src-1",
    name: "BBC RSS Feed",
    source_type: "rss",
    status: "active",
    base_url: null,
    feed_url: "https://feeds.bbci.co.uk/news/rss.xml",
    api_endpoint: null,
    trust_level: "high",
    scan_mode: "auto",
    language: "en",
    category: "general",
    notes: "BBC main news feed",
    created_at: "2026-04-02T10:00:00Z",
    updated_at: "2026-04-02T10:00:00Z",
  },
  {
    id: "src-2",
    name: "Manual Tech Source",
    source_type: "manual_url",
    status: "paused",
    base_url: "https://techcrunch.com",
    feed_url: null,
    api_endpoint: null,
    trust_level: "medium",
    scan_mode: "manual",
    language: "en",
    category: "tech",
    notes: null,
    created_at: "2026-04-02T11:00:00Z",
    updated_at: "2026-04-02T11:00:00Z",
  },
];

function mockFetch(data: unknown, status = 200) {
  return vi.fn((url: string | URL | Request) => {
    const urlStr = String(url);
    // Handle visibility resolve requests (from ReadOnlyGuard)
    if (urlStr.includes("/visibility-rules/resolve")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }),
      });
    }
    // Post Gate Sources Closure, `/sources` responds with a pagination
    // envelope `{ items, total, offset, limit }`. useSourcesList extracts
    // `.items`, so raw arrays in tests must be wrapped. Detail endpoints
    // (`/sources/:id`) still return a single SourceResponse object.
    if (
      urlStr.includes("/sources") &&
      !urlStr.match(/\/sources\/[^/?]+($|\?|\/)/) &&
      Array.isArray(data)
    ) {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () =>
          Promise.resolve({
            items: data,
            total: (data as unknown[]).length,
            offset: 0,
            limit: (data as unknown[]).length || 50,
          }),
      });
    }
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    });
  }) as unknown as typeof window.fetch;
}

function renderRegistry(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/sources", element: <SourcesRegistryPage /> }],
    { initialEntries: ["/admin/sources"] }
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

describe("Sources Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderRegistry(mockFetch(MOCK_SOURCES));
    expect(screen.getByRole("heading", { name: "Sources Registry" })).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/sources", element: <SourcesRegistryPage /> }],
      { initialEntries: ["/admin/sources"] }
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
      [{ path: "/admin/sources", element: <SourcesRegistryPage /> }],
      { initialEntries: ["/admin/sources"] }
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

  it("shows empty state when no sources", async () => {
    renderRegistry(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz source yok.")).toBeDefined();
    });
  });

  it("displays source list after data loads", async () => {
    renderRegistry(mockFetch(MOCK_SOURCES));
    await waitFor(() => {
      expect(screen.getByText("BBC RSS Feed")).toBeDefined();
      expect(screen.getByText("Manual Tech Source")).toBeDefined();
    });
  });

  it("shows source_type column values", async () => {
    renderRegistry(mockFetch(MOCK_SOURCES));
    await waitFor(() => {
      expect(screen.getAllByText("rss").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("manual_url").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("detail panel is hidden (inside Sheet) until a source is clicked", async () => {
    renderRegistry(mockFetch(MOCK_SOURCES));
    await waitFor(() => {
      // Sheet starts closed — detail placeholder is NOT visible
      expect(screen.queryByTestId("sources-sheet")).toBeNull();
    });
  });

  it("shows detail panel loading state after selection", async () => {
    let listCallDone = false;
    window.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/visibility-rules/resolve")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }) });
      }
      if (!listCallDone) {
        listCallDone = true;
        // `/sources` envelope: wrap MOCK_SOURCES under `items` for
        // useSourcesList's `resp.items` extraction.
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: MOCK_SOURCES,
              total: MOCK_SOURCES.length,
              offset: 0,
              limit: MOCK_SOURCES.length,
            }),
        });
      }
      return new Promise(() => {}); // detail never resolves
    }) as unknown as typeof window.fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/sources", element: <SourcesRegistryPage /> }],
      { initialEntries: ["/admin/sources"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("BBC RSS Feed")).toBeDefined());
    await user.click(screen.getByText("BBC RSS Feed"));
    await waitFor(() => {
      expect(screen.getByText("Yükleniyor...")).toBeDefined();
    });
  });

  it("shows detail panel data after selecting a source", async () => {
    let listCallDone = false;
    window.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/visibility-rules/resolve")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }) });
      }
      if (!listCallDone) {
        listCallDone = true;
        // Same envelope wrapping as above — useSourcesList pulls `.items`.
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: MOCK_SOURCES,
              total: MOCK_SOURCES.length,
              offset: 0,
              limit: MOCK_SOURCES.length,
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SOURCES[0]) });
    }) as unknown as typeof window.fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/sources", element: <SourcesRegistryPage /> }],
      { initialEntries: ["/admin/sources"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("BBC RSS Feed")).toBeDefined());
    await user.click(screen.getByText("BBC RSS Feed"));
    await waitFor(() => {
      const matches = screen.getAllByText("BBC RSS Feed");
      expect(matches.length).toBeGreaterThanOrEqual(2); // table row + detail panel
    });
  });
});
