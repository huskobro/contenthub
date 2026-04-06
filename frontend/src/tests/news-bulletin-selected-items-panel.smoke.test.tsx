import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewsBulletinSelectedItemsPanel } from "../components/news-bulletin/NewsBulletinSelectedItemsPanel";
import type { NewsBulletinSelectedItemResponse } from "../api/newsBulletinApi";

const MOCK_ITEM: NewsBulletinSelectedItemResponse = {
  id: "sel-1",
  news_bulletin_id: "bulletin-1",
  news_item_id: "news-abc-123",
  sort_order: 1,
  selection_reason: "Top story",
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  edited_narration: null,
};

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function renderPanel(fetchFn: typeof window.fetch, bulletinId = "bulletin-1") {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{ path: "/", element: <NewsBulletinSelectedItemsPanel bulletinId={bulletinId} /> }],
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

describe("NewsBulletinSelectedItemsPanel smoke tests", () => {
  it("shows loading state initially", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    renderPanel(window.fetch);
    expect(screen.getByText("Selected news yükleniyor...")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    renderPanel(mockFetch({}, 500));
    await waitFor(() => {
      expect(screen.getByText("Selected news yüklenirken hata oluştu.")).toBeDefined();
    });
  });

  it("shows empty state when no items", async () => {
    renderPanel(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz seçilmiş haber yok.")).toBeDefined();
    });
  });

  it("shows '+ Manuel Ekle' button", async () => {
    renderPanel(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Manuel Ekle" })).toBeDefined();
    });
  });

  it("opens create form when '+ Manuel Ekle' is clicked", async () => {
    renderPanel(mockFetch([]));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Manuel Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Manuel Ekle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Selected Item Ekle" })).toBeDefined();
    });
  });

  it("shows validation error when news_item_id is empty on submit", async () => {
    renderPanel(mockFetch([]));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Manuel Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Manuel Ekle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Selected Item Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Ekle" }));
    await waitFor(() => {
      expect(screen.getByText("News Item ID boş olamaz.")).toBeDefined();
    });
  });

  it("shows validation error when sort_order is negative", async () => {
    renderPanel(mockFetch([]));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Manuel Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Manuel Ekle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Selected Item Ekle" })).toBeDefined());
    const inputs = screen.getAllByRole("textbox");
    // inputs[0] = news_item_id, inputs[1] = sort_order, inputs[2] = selection_reason
    await user.clear(inputs[0]);
    await user.type(inputs[0], "some-id");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "-1");
    await user.click(screen.getByRole("button", { name: "Ekle" }));
    await waitFor(() => {
      expect(screen.getByText("Sort order negatif olamaz.")).toBeDefined();
    });
  });

  it("cancel closes create form and returns to view", async () => {
    renderPanel(mockFetch([]));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Manuel Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Manuel Ekle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Selected Item Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.getByText("Henüz seçilmiş haber yok.")).toBeDefined();
    });
  });

  it("shows item list when items exist", async () => {
    renderPanel(mockFetch([MOCK_ITEM]));
    await waitFor(() => {
      expect(screen.getByText("news-abc-123")).toBeDefined();
    });
  });

  it("shows Düzenle button for each item", async () => {
    renderPanel(mockFetch([MOCK_ITEM]));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("opens edit form when Düzenle is clicked", async () => {
    renderPanel(mockFetch([MOCK_ITEM]));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Selected Item Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes edit form and returns to view", async () => {
    renderPanel(mockFetch([MOCK_ITEM]));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Selected Item Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.getByText("news-abc-123")).toBeDefined();
    });
  });
});
