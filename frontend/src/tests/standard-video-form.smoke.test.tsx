import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StandardVideoCreatePage } from "../pages/admin/StandardVideoCreatePage";
import { StandardVideoDetailPage } from "../pages/admin/StandardVideoDetailPage";
import type { StandardVideoResponse } from "../api/standardVideoApi";

const MOCK_VIDEO: StandardVideoResponse = {
  id: "sv-edit-1",
  title: "Test Başlık",
  topic: "Test Konu",
  brief: "Kısa açıklama",
  target_duration_seconds: 90,
  tone: "formal",
  language: "tr",
  visual_direction: "clean",
  subtitle_style: "standard",
  status: "draft",
  job_id: null,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
};

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function renderCreatePage() {
  window.fetch = mockFetch({ ...MOCK_VIDEO, id: "sv-new-1" });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const testRouter = createMemoryRouter(
    [
      { path: "/admin/standard-videos/new", element: <StandardVideoCreatePage /> },
      { path: "/admin/standard-videos/:itemId", element: <div>Detay Sayfası</div> },
    ],
    { initialEntries: ["/admin/standard-videos/new"] }
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>
  );
}

function renderDetailPage(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/standard-videos/:itemId", element: <StandardVideoDetailPage /> }],
    { initialEntries: ["/admin/standard-videos/sv-edit-1"] }
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

describe("Standard Video Form smoke tests", () => {
  it("create page renders the form heading", () => {
    renderCreatePage();
    expect(screen.getByRole("heading", { name: "Yeni Standard Video" })).toBeDefined();
  });

  it("create page shows topic field", () => {
    renderCreatePage();
    expect(screen.getByPlaceholderText("Videonun ana konusu")).toBeDefined();
  });

  it("topic validation shows error when empty", async () => {
    const user = userEvent.setup();
    renderCreatePage();
    const submitBtn = screen.getByRole("button", { name: "Oluştur" });
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("Konu zorunludur.")).toBeDefined();
    });
  });

  it("detail page renders edit button after loading", async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/script")) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      }
      if (url.includes("/metadata")) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_VIDEO) });
    });
    renderDetailPage(fetchFn);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("detail page shows edit form when Düzenle is clicked", async () => {
    const user = userEvent.setup();
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/script")) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      }
      if (url.includes("/metadata")) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_VIDEO) });
    });
    renderDetailPage(fetchFn);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Güncelle" })).toBeDefined();
    });
  });

  it("edit form is pre-filled with existing video data", async () => {
    const user = userEvent.setup();
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/script")) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      }
      if (url.includes("/metadata")) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_VIDEO) });
    });
    renderDetailPage(fetchFn);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      const topicInput = screen.getByPlaceholderText("Videonun ana konusu") as HTMLInputElement;
      expect(topicInput.value).toBe("Test Konu");
    });
  });
});
