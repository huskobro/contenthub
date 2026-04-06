import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewsBulletinCreatePage } from "../pages/admin/NewsBulletinCreatePage";
import { NewsBulletinRegistryPage } from "../pages/admin/NewsBulletinRegistryPage";
import type { NewsBulletinResponse } from "../api/newsBulletinApi";

const MOCK_BULLETIN: NewsBulletinResponse = {
  id: "bulletin-1",
  title: "Morning Bulletin",
  topic: "Tech News Today",
  brief: "Focus on AI",
  target_duration_seconds: 120,
  language: "tr",
  tone: "formal",
  bulletin_style: "studio",
  source_mode: "manual",
  selected_news_ids_json: '["id-1"]',
  status: "draft",
  job_id: null,
  created_at: "2026-04-02T08:00:00Z",
  updated_at: "2026-04-02T08:00:00Z",
  composition_direction: null,
  thumbnail_direction: null,
  template_id: null,
  style_blueprint_id: null,
  render_mode: null,
  subtitle_style: null,
  lower_third_style: null,
  trust_enforcement_level: null,
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
      { path: "/admin/news-bulletins/new", element: <NewsBulletinCreatePage /> },
      { path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> },
    ],
    { initialEntries: ["/admin/news-bulletins/new"] }
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

describe("NewsBulletinForm / Create page smoke tests", () => {
  it("renders the create page heading", () => {
    renderCreatePage(mockFetch(MOCK_BULLETIN));
    expect(screen.getByTestId("nb-create-heading")).toBeDefined();
  });

  it("shows topic field", () => {
    renderCreatePage(mockFetch(MOCK_BULLETIN));
    expect(screen.getByText(/Topic/)).toBeDefined();
  });

  it("shows validation error when topic is empty on submit", async () => {
    renderCreatePage(mockFetch(MOCK_BULLETIN));
    const user = userEvent.setup();
    const submitBtn = screen.getByRole("button", { name: "Oluştur" });
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("Topic zorunludur.")).toBeDefined();
    });
  });

  it("cancel button is present and clickable on create page", () => {
    renderCreatePage(mockFetch(MOCK_BULLETIN, 201));
    const cancelBtn = screen.getByRole("button", { name: "İptal" });
    expect(cancelBtn).toBeDefined();
  });

  it("calls create mutation on valid submit", async () => {
    let postCalled = false;
    window.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") {
        postCalled = true;
        return new Promise(() => {}); // never resolves to prevent navigation
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [
        { path: "/admin/news-bulletins/new", element: <NewsBulletinCreatePage /> },
        { path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> },
      ],
      { initialEntries: ["/admin/news-bulletins/new"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    const topicInput = screen.getAllByRole("textbox")[0];
    await user.clear(topicInput);
    await user.type(topicInput, "Tech Bulletin");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(postCalled).toBe(true);
    });
  });

  it("registry page shows '+ Yeni News Bulletin' button", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve([]),
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> }],
      { initialEntries: ["/admin/news-bulletins"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByRole("button", { name: "Wizard ile Olustur" })).toBeDefined();
  });

  it("edit mode opens when Düzenle is clicked in detail panel", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_BULLETIN]) });
      }
      if (typeof url === "string" && url.includes("/selected-news")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      if (typeof url === "string" && (url.includes("/script") || url.includes("/metadata"))) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BULLETIN) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> }],
      { initialEntries: ["/admin/news-bulletins"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Tech News Today")).toBeDefined());
    await user.click(screen.getByText("Tech News Today"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "News Bulletin Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes edit mode in detail panel", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_BULLETIN]) });
      }
      if (typeof url === "string" && url.includes("/selected-news")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      if (typeof url === "string" && (url.includes("/script") || url.includes("/metadata"))) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BULLETIN) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/news-bulletins", element: <NewsBulletinRegistryPage /> }],
      { initialEntries: ["/admin/news-bulletins"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Tech News Today")).toBeDefined());
    await user.click(screen.getByText("Tech News Today"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "News Bulletin Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.getByTestId("nb-detail-heading")).toBeDefined();
    });
  });
});
