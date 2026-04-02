import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewsBulletinMetadataPanel } from "../components/news-bulletin/NewsBulletinMetadataPanel";
import type { NewsBulletinMetadataResponse } from "../api/newsBulletinApi";

const MOCK_METADATA: NewsBulletinMetadataResponse = {
  id: "meta-1",
  news_bulletin_id: "bulletin-1",
  title: "Sabah Bülteni Metadata",
  description: "Yapay zeka haberleri özeti",
  tags_json: '["ai","tech"]',
  category: "Teknoloji",
  language: "tr",
  version: 1,
  source_type: "manual",
  generation_status: "draft",
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

function renderPanel(fetchFn: typeof window.fetch, bulletinId = "bulletin-1") {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{ path: "/", element: <NewsBulletinMetadataPanel bulletinId={bulletinId} /> }],
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

describe("NewsBulletinMetadataPanel smoke tests", () => {
  it("shows loading state initially", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    renderPanel(window.fetch);
    expect(screen.getByText("Metadata yükleniyor...")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    renderPanel(mockFetch({}, 500));
    await waitFor(() => {
      expect(screen.getByText("Metadata yüklenirken hata oluştu.")).toBeDefined();
    });
  });

  it("shows empty state when no metadata (404)", async () => {
    renderPanel(mockFetch({}, 404));
    await waitFor(() => {
      expect(screen.getByText("Henüz metadata yok.")).toBeDefined();
    });
  });

  it("shows '+ Metadata Ekle' button when no metadata", async () => {
    renderPanel(mockFetch({}, 404));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Metadata Ekle" })).toBeDefined();
    });
  });

  it("opens create form when '+ Metadata Ekle' is clicked", async () => {
    renderPanel(mockFetch({}, 404));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Metadata Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Metadata Ekle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Metadata Oluştur" })).toBeDefined();
    });
  });

  it("shows validation error when title is empty on submit", async () => {
    renderPanel(mockFetch({}, 404));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Metadata Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Metadata Ekle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Metadata Oluştur" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Başlık boş olamaz.")).toBeDefined();
    });
  });

  it("cancel closes create form and returns to view", async () => {
    renderPanel(mockFetch({}, 404));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Metadata Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Metadata Ekle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Metadata Oluştur" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.getByText("Henüz metadata yok.")).toBeDefined();
    });
  });

  it("shows metadata content when metadata exists", async () => {
    renderPanel(mockFetch(MOCK_METADATA));
    await waitFor(() => {
      expect(screen.getByText("Sabah Bülteni Metadata")).toBeDefined();
    });
  });

  it("shows Düzenle button when metadata exists", async () => {
    renderPanel(mockFetch(MOCK_METADATA));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("opens edit form when Düzenle is clicked", async () => {
    renderPanel(mockFetch(MOCK_METADATA));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Metadata Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes edit form and returns to view", async () => {
    renderPanel(mockFetch(MOCK_METADATA));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Metadata Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.getByText("Sabah Bülteni Metadata")).toBeDefined();
    });
  });
});
