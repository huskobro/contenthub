import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SourceCreatePage } from "../pages/admin/SourceCreatePage";
import { SourcesRegistryPage } from "../pages/admin/SourcesRegistryPage";
import type { SourceResponse } from "../api/sourcesApi";

const MOCK_SOURCE: SourceResponse = {
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
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
};

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function renderCreatePage(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [
      { path: "/admin/sources/new", element: <SourceCreatePage /> },
      { path: "/admin/sources", element: <SourcesRegistryPage /> },
    ],
    { initialEntries: ["/admin/sources/new"] }
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

describe("SourceForm / Create page smoke tests", () => {
  it("renders create page heading", () => {
    renderCreatePage(mockFetch(MOCK_SOURCE, 201));
    expect(screen.getByRole("heading", { name: "Yeni Source" })).toBeDefined();
  });

  it("shows name required validation error", async () => {
    renderCreatePage(mockFetch(MOCK_SOURCE, 201));
    const user = userEvent.setup();
    const submitBtn = screen.getByRole("button", { name: "Oluştur" });
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText(/Name zorunludur/)).toBeDefined();
    });
  });

  it("shows rss feed_url required validation", async () => {
    renderCreatePage(mockFetch(MOCK_SOURCE, 201));
    const user = userEvent.setup();
    const nameInput = screen.getByPlaceholderText("Source adı");
    await user.type(nameInput, "Test RSS");
    // source_type is already rss by default; clear feed_url if populated
    const submitBtn = screen.getByRole("button", { name: "Oluştur" });
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText(/feed_url zorunludur/)).toBeDefined();
    });
  });

  it("calls create mutation on valid RSS submit (fetch called with POST)", async () => {
    // Use a fetch mock that never resolves for POST to avoid navigation AbortSignal issue
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      callCount++;
      if (init?.method === "POST") {
        return new Promise(() => {}); // never resolves — avoids navigation
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    });
    renderCreatePage(fetchMock);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Source adı"), "BBC Feed");
    await user.type(screen.getByPlaceholderText("https://example.com/feed.xml"), "https://bbc.co.uk/feed.xml");

    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/sources",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("cancel button is present and clickable on create page", () => {
    renderCreatePage(mockFetch(MOCK_SOURCE, 201));
    const cancelBtn = screen.getByRole("button", { name: "İptal" });
    expect(cancelBtn).toBeDefined();
  });

  it("registry page shows '+ Yeni Source' button", async () => {
    window.fetch = mockFetch([MOCK_SOURCE]);
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
      expect(screen.getByRole("button", { name: "+ Yeni Source" })).toBeDefined();
    });
  });

  it("edit mode opens when Düzenle is clicked in detail panel", async () => {
    window.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/visibility-rules/resolve")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }) });
      }
      if (String(url).includes("/sources/src-1")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SOURCE) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_SOURCE]) });
    });
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
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Güncelle" })).toBeDefined();
    });
  });

  it("cancel closes edit mode in detail panel", async () => {
    window.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/visibility-rules/resolve")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }) });
      }
      if (String(url).includes("/sources/src-1")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SOURCE) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_SOURCE]) });
    });
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
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "İptal" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("update mutation is called with PATCH on valid submit", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/visibility-rules/resolve")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }) });
      }
      if (String(url).includes("/sources/src-1")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SOURCE) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_SOURCE]) });
    });
    window.fetch = fetchMock;
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
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Güncelle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Güncelle" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/sources/"),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });
});
