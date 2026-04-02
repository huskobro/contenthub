import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsedNewsRegistryPage } from "../pages/admin/UsedNewsRegistryPage";
import type { UsedNewsResponse } from "../api/usedNewsApi";

const MOCK_RECORD: UsedNewsResponse = {
  id: "used-1",
  news_item_id: "news-abc-123",
  usage_type: "bulletin_script",
  usage_context: "Morning Bulletin",
  target_module: "news_bulletin",
  target_entity_id: "bulletin-1",
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  has_news_item_source: true,
  has_news_item_scan_reference: false,
  has_target_resolved: true,
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
    [{ path: "/admin/used-news", element: <UsedNewsRegistryPage /> }],
    { initialEntries: ["/admin/used-news"] }
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

describe("Used News Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderPage(mockFetch([]));
    expect(screen.getByRole("heading", { name: "Used News Registry" })).toBeDefined();
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

  it("shows empty state when no records", async () => {
    renderPage(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz kullanılmış haber kaydı yok.")).toBeDefined();
    });
  });

  it("displays record list after data loads", async () => {
    renderPage(mockFetch([MOCK_RECORD]));
    await waitFor(() => {
      expect(screen.getByText("news-abc-123")).toBeDefined();
    });
  });

  it("shows usage_type column", async () => {
    renderPage(mockFetch([MOCK_RECORD]));
    await waitFor(() => {
      expect(screen.getByText("bulletin_script")).toBeDefined();
    });
  });

  it("shows no detail panel when nothing is selected", async () => {
    renderPage(mockFetch([]));
    await waitFor(() => {
      expect(screen.queryByText("Used News Detayı")).toBeNull();
    });
  });

  it("opens detail panel when a record is clicked", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_RECORD]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/used-news", element: <UsedNewsRegistryPage /> }],
      { initialEntries: ["/admin/used-news"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("news-abc-123")).toBeDefined());
    await user.click(screen.getByText("news-abc-123"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Used News Detayı" })).toBeDefined();
    });
  });
});
