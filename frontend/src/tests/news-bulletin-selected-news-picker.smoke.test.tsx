import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewsBulletinSelectedNewsPicker } from "../components/news-bulletin/NewsBulletinSelectedNewsPicker";
import type { NewsItemResponse } from "../api/newsItemsApi";

const MOCK_NEWS_ITEM: NewsItemResponse = {
  id: "news-item-1",
  title: "Test Haberi Başlığı",
  url: "https://example.com/news/1",
  status: "new",
  source_id: null,
  source_scan_id: null,
  summary: null,
  published_at: "2026-04-02T08:00:00Z",
  language: "tr",
  category: "Teknoloji",
  dedupe_key: null,
  raw_payload_json: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
};

function renderPicker(fetchFn: typeof window.fetch, onSelect = vi.fn()) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{
      path: "/",
      element: (
        <NewsBulletinSelectedNewsPicker
          onSelect={onSelect}
          isAdding={false}
          addError={null}
        />
      ),
    }],
    { initialEntries: ["/"] }
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

describe("NewsBulletinSelectedNewsPicker smoke tests", () => {
  it("renders the toggle button closed by default", () => {
    renderPicker(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }));
    expect(screen.getByRole("button", { name: "▼ Haberden seç" })).toBeDefined();
  });

  it("opens picker when toggle button is clicked", async () => {
    renderPicker(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "▼ Haberden seç" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "▲ Haber seçmeyi kapat" })).toBeDefined();
    });
  });

  it("shows loading state while fetching", async () => {
    renderPicker(vi.fn().mockReturnValue(new Promise(() => {})));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "▼ Haberden seç" }));
    await waitFor(() => {
      expect(screen.getByText("Haberler yükleniyor...")).toBeDefined();
    });
  });

  it("shows error state on fetch failure", async () => {
    renderPicker(vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "▼ Haberden seç" }));
    await waitFor(() => {
      expect(screen.getByText("Haberler yüklenemedi.")).toBeDefined();
    });
  });

  it("shows empty state when no news items", async () => {
    renderPicker(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "▼ Haberden seç" }));
    await waitFor(() => {
      expect(screen.getByText("Haber bulunamadı.")).toBeDefined();
    });
  });

  it("shows news items list when data loads", async () => {
    renderPicker(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([MOCK_NEWS_ITEM]) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "▼ Haberden seç" }));
    await waitFor(() => {
      expect(screen.getByText("Test Haberi Başlığı")).toBeDefined();
    });
  });

  it("shows Seç button for each news item", async () => {
    renderPicker(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([MOCK_NEWS_ITEM]) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "▼ Haberden seç" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Seç" })).toBeDefined();
    });
  });

  it("calls onSelect when Seç is clicked", async () => {
    const onSelect = vi.fn();
    renderPicker(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([MOCK_NEWS_ITEM]) }), onSelect);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "▼ Haberden seç" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Seç" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Seç" }));
    expect(onSelect).toHaveBeenCalledWith(MOCK_NEWS_ITEM);
  });

  it("closes picker after item is selected", async () => {
    renderPicker(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([MOCK_NEWS_ITEM]) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "▼ Haberden seç" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Seç" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Seç" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "▼ Haberden seç" })).toBeDefined();
    });
  });

  it("shows addError when provided", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) });
    const testRouter = createMemoryRouter(
      [{
        path: "/",
        element: (
          <NewsBulletinSelectedNewsPicker
            onSelect={vi.fn()}
            isAdding={false}
            addError="Bu haber zaten eklenmiş (duplicate)."
          />
        ),
      }],
      { initialEntries: ["/"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Bu haber zaten eklenmiş (duplicate).")).toBeDefined();
  });
});
