import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewsBulletinScriptPanel } from "../components/news-bulletin/NewsBulletinScriptPanel";
import type { NewsBulletinScriptResponse } from "../api/newsBulletinApi";

const MOCK_SCRIPT: NewsBulletinScriptResponse = {
  id: "script-1",
  news_bulletin_id: "bulletin-1",
  content: "Bugün teknoloji dünyasında önemli gelişmeler yaşandı.",
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
    [{ path: "/", element: <NewsBulletinScriptPanel bulletinId={bulletinId} /> }],
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

describe("NewsBulletinScriptPanel smoke tests", () => {
  it("shows loading state initially", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    renderPanel(window.fetch);
    expect(screen.getByText("Script yükleniyor...")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    renderPanel(mockFetch({}, 500));
    await waitFor(() => {
      expect(screen.getByText("Script yüklenirken hata oluştu.")).toBeDefined();
    });
  });

  it("shows empty state when no script (404)", async () => {
    renderPanel(mockFetch({}, 404));
    await waitFor(() => {
      expect(screen.getByText("Henüz script yok.")).toBeDefined();
    });
  });

  it("shows '+ Script Ekle' button when no script", async () => {
    renderPanel(mockFetch({}, 404));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Script Ekle" })).toBeDefined();
    });
  });

  it("shows script content when script exists", async () => {
    renderPanel(mockFetch(MOCK_SCRIPT));
    await waitFor(() => {
      expect(screen.getByText("Bugün teknoloji dünyasında önemli gelişmeler yaşandı.")).toBeDefined();
    });
  });

  it("shows Düzenle button when script exists", async () => {
    renderPanel(mockFetch(MOCK_SCRIPT));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("opens create form when '+ Script Ekle' is clicked", async () => {
    renderPanel(mockFetch({}, 404));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Script Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Script Ekle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Script Oluştur" })).toBeDefined();
    });
  });

  it("opens edit form when Düzenle is clicked", async () => {
    renderPanel(mockFetch(MOCK_SCRIPT));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Script Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes create form and returns to view", async () => {
    renderPanel(mockFetch({}, 404));
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Script Ekle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "+ Script Ekle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Script Oluştur" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.getByText("Henüz script yok.")).toBeDefined();
    });
  });
});
