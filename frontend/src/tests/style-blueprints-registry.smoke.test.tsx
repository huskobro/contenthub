import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StyleBlueprintsRegistryPage } from "../pages/admin/StyleBlueprintsRegistryPage";
import type { StyleBlueprintResponse } from "../api/styleBlueprintsApi";

const MOCK_BLUEPRINTS: StyleBlueprintResponse[] = [
  {
    id: "bp-1",
    name: "Standard Video Style",
    module_scope: "standard_video",
    status: "active",
    version: 1,
    visual_rules_json: '{"bg_color":"#000"}',
    motion_rules_json: null,
    layout_rules_json: null,
    subtitle_rules_json: null,
    thumbnail_rules_json: null,
    preview_strategy_json: null,
    notes: "Main style blueprint",
    created_at: "2026-04-02T10:00:00Z",
    updated_at: "2026-04-02T10:00:00Z",
  },
  {
    id: "bp-2",
    name: "News Bulletin Style",
    module_scope: "news_bulletin",
    status: "draft",
    version: 2,
    visual_rules_json: null,
    motion_rules_json: '{"speed":"fast"}',
    layout_rules_json: null,
    subtitle_rules_json: null,
    thumbnail_rules_json: null,
    preview_strategy_json: null,
    notes: null,
    created_at: "2026-04-02T11:00:00Z",
    updated_at: "2026-04-02T11:00:00Z",
  },
];

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function renderRegistry(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/style-blueprints", element: <StyleBlueprintsRegistryPage /> }],
    { initialEntries: ["/admin/style-blueprints"] }
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

describe("Style Blueprints Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderRegistry(mockFetch(MOCK_BLUEPRINTS));
    expect(screen.getByTestId("sb-registry-heading")).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/style-blueprints", element: <StyleBlueprintsRegistryPage /> }],
      { initialEntries: ["/admin/style-blueprints"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    window.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/style-blueprints", element: <StyleBlueprintsRegistryPage /> }],
      { initialEntries: ["/admin/style-blueprints"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Hata/)).toBeDefined();
    });
  });

  it("shows empty state when no blueprints", async () => {
    renderRegistry(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz style blueprint yok.")).toBeDefined();
    });
  });

  it("displays blueprint list after data loads", async () => {
    renderRegistry(mockFetch(MOCK_BLUEPRINTS));
    await waitFor(() => {
      expect(screen.getByText("Standard Video Style")).toBeDefined();
      expect(screen.getByText("News Bulletin Style")).toBeDefined();
    });
  });

  it("shows module_scope column values", async () => {
    renderRegistry(mockFetch(MOCK_BLUEPRINTS));
    await waitFor(() => {
      expect(screen.getByText("standard_video")).toBeDefined();
      expect(screen.getByText("news_bulletin")).toBeDefined();
    });
  });

  it("shows no detail panel when nothing is selected", async () => {
    renderRegistry(mockFetch(MOCK_BLUEPRINTS));
    await waitFor(() => {
      expect(screen.getByText("Bir style blueprint seçin.")).toBeDefined();
    });
  });

  it("shows detail panel loading state after selection", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINTS) });
      }
      return new Promise(() => {}); // detail never resolves
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/style-blueprints", element: <StyleBlueprintsRegistryPage /> }],
      { initialEntries: ["/admin/style-blueprints"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Standard Video Style")).toBeDefined());
    await user.click(screen.getByText("Standard Video Style"));
    await waitFor(() => {
      expect(screen.getByText("Yükleniyor...")).toBeDefined();
    });
  });

  it("shows detail panel data after selecting a blueprint", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINTS) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINTS[0]) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/style-blueprints", element: <StyleBlueprintsRegistryPage /> }],
      { initialEntries: ["/admin/style-blueprints"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Standard Video Style")).toBeDefined());
    await user.click(screen.getByText("Standard Video Style"));
    await waitFor(() => {
      const matches = screen.getAllByText("Standard Video Style");
      expect(matches.length).toBeGreaterThanOrEqual(2); // table row + detail panel
    });
  });
});
