import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewsItemCreatePage } from "../pages/admin/NewsItemCreatePage";
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

function makeRouter(
  fetchFn: typeof window.fetch,
  initialPath = "/admin/news-items/new"
) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [
      { path: "/admin/news-items/new", element: <NewsItemCreatePage /> },
      { path: "/admin/news-items", element: <NewsItemsRegistryPage /> },
    ],
    { initialEntries: [initialPath] }
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

describe("NewsItem form smoke tests", () => {
  it("renders the create page heading", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) }));
    expect(screen.getByRole("heading", { name: "Yeni News Item" })).toBeDefined();
  });

  it("shows title required error on empty submit", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Başlık zorunlu")).toBeDefined();
    });
  });

  it("shows url required error on empty submit", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("URL zorunlu")).toBeDefined();
    });
  });

  it("cancel button is present on create page", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) }));
    expect(screen.getByRole("button", { name: "İptal" })).toBeDefined();
  });

  it("submit button is present on create page", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) }));
    expect(screen.getByRole("button", { name: "Oluştur" })).toBeDefined();
  });

  it("registry page shows Yeni button", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
      "/admin/news-items"
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Yeni" })).toBeDefined();
    });
  });

  it("registry page shows item in list after load", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([MOCK_ITEM]) }),
      "/admin/news-items"
    );
    await waitFor(() => {
      expect(screen.getByText("AI Teknolojisinde Yeni Gelişmeler")).toBeDefined();
    });
  });

  it("detail panel shows Düzenle button when item selected", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_ITEM]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) });
    });
    makeRouter(fetchFn, "/admin/news-items");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("AI Teknolojisinde Yeni Gelişmeler")).toBeDefined());
    await user.click(screen.getByText("AI Teknolojisinde Yeni Gelişmeler"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("edit mode opens when Düzenle is clicked", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_ITEM]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) });
    });
    makeRouter(fetchFn, "/admin/news-items");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("AI Teknolojisinde Yeni Gelişmeler")).toBeDefined());
    await user.click(screen.getByText("AI Teknolojisinde Yeni Gelişmeler"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "News Item Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes edit mode", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_ITEM]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_ITEM) });
    });
    makeRouter(fetchFn, "/admin/news-items");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("AI Teknolojisinde Yeni Gelişmeler")).toBeDefined());
    await user.click(screen.getByText("AI Teknolojisinde Yeni Gelişmeler"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "News Item Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "News Item Düzenle" })).toBeNull();
    });
  });
});
