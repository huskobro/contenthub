import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsedNewsCreatePage } from "../pages/admin/UsedNewsCreatePage";
import { UsedNewsRegistryPage } from "../pages/admin/UsedNewsRegistryPage";
import type { UsedNewsResponse } from "../api/usedNewsApi";

const MOCK_RECORD: UsedNewsResponse = {
  id: "used-1",
  news_item_id: "news-item-abc",
  usage_type: "bulletin",
  target_module: "news_bulletin",
  usage_context: null,
  target_entity_id: null,
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  has_news_item_source: false,
  has_news_item_scan_reference: false,
  has_target_resolved: false,
};

function makeRouter(
  fetchFn: typeof window.fetch,
  initialPath = "/admin/used-news/new"
) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [
      { path: "/admin/used-news/new", element: <UsedNewsCreatePage /> },
      { path: "/admin/used-news", element: <UsedNewsRegistryPage /> },
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

describe("UsedNews form smoke tests", () => {
  it("renders the create page heading", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) }));
    expect(screen.getByRole("heading", { name: "Yeni Used News" })).toBeDefined();
  });

  it("shows news_item_id required error on empty submit", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("News Item ID zorunlu")).toBeDefined();
    });
  });

  it("shows usage_type required error when usage_type is empty", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) }));
    const user = userEvent.setup();
    const newsItemInput = screen.getByPlaceholderText("News item UUID");
    await user.type(newsItemInput, "some-news-item-id");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Usage Type zorunlu")).toBeDefined();
    });
  });

  it("cancel button is present on create page", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) }));
    expect(screen.getByRole("button", { name: "İptal" })).toBeDefined();
  });

  it("submit button is present on create page", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) }));
    expect(screen.getByRole("button", { name: "Oluştur" })).toBeDefined();
  });

  it("registry page shows Yeni button", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
      "/admin/used-news"
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Yeni" })).toBeDefined();
    });
  });

  it("registry page shows record in list after load", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([MOCK_RECORD]) }),
      "/admin/used-news"
    );
    await waitFor(() => {
      expect(screen.getByText("bulletin")).toBeDefined();
    });
  });

  it("detail panel shows Düzenle button when item selected", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_RECORD]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) });
    });
    makeRouter(fetchFn, "/admin/used-news");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("bulletin")).toBeDefined());
    await user.click(screen.getByText("bulletin"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("edit mode opens when Düzenle is clicked", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_RECORD]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) });
    });
    makeRouter(fetchFn, "/admin/used-news");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("bulletin")).toBeDefined());
    await user.click(screen.getByText("bulletin"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Used News Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes edit mode", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_RECORD]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RECORD) });
    });
    makeRouter(fetchFn, "/admin/used-news");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("bulletin")).toBeDefined());
    await user.click(screen.getByText("bulletin"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Used News Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Used News Düzenle" })).toBeNull();
    });
  });
});
