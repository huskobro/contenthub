import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewsItemsRegistryPage } from "../pages/admin/NewsItemsRegistryPage";
import type { NewsItemResponse } from "../api/newsItemsApi";

const MOCK_ITEM: NewsItemResponse = {
  id: "item-1",
  title: "AI Teknolojisinde Yeni Gelişmeler",
  url: "https://example.com/news/ai-tech",
  status: "new",
  source_id: "src-abc-123",
  source_scan_id: null,
  summary: "Yapay zeka alanında önemli gelişmeler yaşandı.",
  published_at: "2026-04-02T08:00:00Z",
  language: "tr",
  category: "Teknoloji",
  dedupe_key: null,
  raw_payload_json: null,
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

function renderPage(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/news-items", element: <NewsItemsRegistryPage /> }],
    { initialEntries: ["/admin/news-items"] }
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

describe("News Items Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderPage(mockFetch([]));
    expect(screen.getByRole("heading", { name: "News Items" })).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    renderPage(window.fetch);
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    renderPage(mockFetch({}, 500));
    await waitFor(() => {
      expect(screen.getByText("Hata: kayıtlar yüklenemedi.")).toBeDefined();
    });
  });

  it("shows empty state when no items", async () => {
    renderPage(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz haber kaydı yok.")).toBeDefined();
    });
  });

  it("displays item list after data loads", async () => {
    renderPage(mockFetch([MOCK_ITEM]));
    await waitFor(() => {
      expect(screen.getByText("AI Teknolojisinde Yeni Gelişmeler")).toBeDefined();
    });
  });

  it("shows status badge", async () => {
    renderPage(mockFetch([MOCK_ITEM]));
    await waitFor(() => {
      expect(screen.getByText("new")).toBeDefined();
    });
  });

  it("shows no detail panel when nothing is selected", async () => {
    renderPage(mockFetch([]));
    await waitFor(() => {
      expect(screen.queryByText("News Item Detayı")).toBeNull();
    });
  });

  it("opens detail panel when an item is clicked", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_ITEM]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/news-items", element: <NewsItemsRegistryPage /> }],
      { initialEntries: ["/admin/news-items"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("AI Teknolojisinde Yeni Gelişmeler")).toBeDefined());
    await user.click(screen.getByText("AI Teknolojisinde Yeni Gelişmeler"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "News Item Detayı" })).toBeDefined();
    });
  });
});
