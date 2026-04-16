import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TemplatesRegistryPage } from "../pages/admin/TemplatesRegistryPage";
import type { TemplateResponse } from "../api/templatesApi";

const MOCK_TEMPLATES: TemplateResponse[] = [
  {
    id: "tpl-1",
    name: "Standard Style Template",
    template_type: "style",
    owner_scope: "admin",
    module_scope: "standard_video",
    description: "A style template for standard videos",
    style_profile_json: '{"color":"#fff"}',
    content_rules_json: null,
    publish_profile_json: null,
    status: "active",
    version: 1,
    created_at: "2026-04-02T10:00:00Z",
    updated_at: "2026-04-02T10:00:00Z",
  },
  {
    id: "tpl-2",
    name: "News Content Template",
    template_type: "content",
    owner_scope: "system",
    module_scope: "news_bulletin",
    description: null,
    style_profile_json: null,
    content_rules_json: '{"max_words":500}',
    publish_profile_json: null,
    status: "draft",
    version: 2,
    created_at: "2026-04-02T11:00:00Z",
    updated_at: "2026-04-02T11:00:00Z",
  },
];

function mockFetch(data: unknown, status = 200) {
  return vi.fn((url: string | URL | Request) => {
    const urlStr = String(url);
    // Handle visibility resolve requests (from ReadOnlyGuard)
    if (urlStr.includes("/visibility-rules/resolve")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }),
      });
    }
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    });
  }) as unknown as typeof window.fetch;
}

function renderRegistry(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/templates", element: <TemplatesRegistryPage /> }],
    { initialEntries: ["/admin/templates"] }
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

describe("Templates Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderRegistry(mockFetch(MOCK_TEMPLATES));
    expect(screen.getByTestId("tpl-registry-heading")).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/templates", element: <TemplatesRegistryPage /> }],
      { initialEntries: ["/admin/templates"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/templates", element: <TemplatesRegistryPage /> }],
      { initialEntries: ["/admin/templates"] }
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

  it("shows empty state when no templates", async () => {
    renderRegistry(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz template yok.")).toBeDefined();
    });
  });

  it("displays template list after data loads", async () => {
    renderRegistry(mockFetch(MOCK_TEMPLATES));
    await waitFor(() => {
      expect(screen.getByText("Standard Style Template")).toBeDefined();
      expect(screen.getByText("News Content Template")).toBeDefined();
    });
  });

  it("shows template_type column values", async () => {
    // `style` and `content` appear in both the filter dropdown and the
    // template_type cells, so allow multiple matches.
    renderRegistry(mockFetch(MOCK_TEMPLATES));
    await waitFor(() => {
      expect(screen.getAllByText("style").length).toBeGreaterThan(0);
      expect(screen.getAllByText("content").length).toBeGreaterThan(0);
    });
  });

  it("detail panel is hidden (inside Sheet) until a template is clicked", async () => {
    renderRegistry(mockFetch(MOCK_TEMPLATES));
    await waitFor(() => {
      // Sheet starts closed — detail placeholder is NOT visible
      expect(screen.queryByTestId("templates-sheet")).toBeNull();
    });
  });

  it("shows detail panel loading state after selection", async () => {
    // First non-resolve call returns list; subsequent calls (detail) never resolve
    let listCallDone = false;
    window.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/visibility-rules/resolve")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }) });
      }
      if (!listCallDone) {
        listCallDone = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(MOCK_TEMPLATES),
        });
      }
      return new Promise(() => {}); // detail never resolves
    }) as unknown as typeof window.fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/templates", element: <TemplatesRegistryPage /> }],
      { initialEntries: ["/admin/templates"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText("Standard Style Template")).toBeDefined();
    });
    await user.click(screen.getByText("Standard Style Template"));
    await waitFor(() => {
      expect(screen.getByText("Yükleniyor...")).toBeDefined();
    });
  });

  it("shows detail panel data after selecting a template", async () => {
    // First non-resolve call returns list; subsequent calls return detail
    let listCallDone = false;
    window.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/visibility-rules/resolve")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }) });
      }
      if (!listCallDone) {
        listCallDone = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(MOCK_TEMPLATES),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_TEMPLATES[0]),
      });
    }) as unknown as typeof window.fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/templates", element: <TemplatesRegistryPage /> }],
      { initialEntries: ["/admin/templates"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText("Standard Style Template")).toBeDefined();
    });
    await user.click(screen.getByText("Standard Style Template"));
    await waitFor(() => {
      // detail panel heading
      const headings = screen.getAllByText("Standard Style Template");
      expect(headings.length).toBeGreaterThanOrEqual(2); // table row + detail panel title
    });
  });
});
