import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TemplateStyleLinksRegistryPage } from "../pages/admin/TemplateStyleLinksRegistryPage";
import type { TemplateStyleLinkResponse } from "../api/templateStyleLinksApi";

const MOCK_LINK: TemplateStyleLinkResponse = {
  id: "link-1",
  template_id: "tmpl-abc-123",
  style_blueprint_id: "bp-xyz-456",
  link_role: "primary",
  status: "active",
  notes: "Ana bağlantı",
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

function renderPage(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/template-style-links", element: <TemplateStyleLinksRegistryPage /> }],
    { initialEntries: ["/admin/template-style-links"] }
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

describe("Template Style Links Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderPage(mockFetch([]));
    expect(screen.getByTestId("tsl-registry-heading")).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    renderPage(window.fetch);
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    renderPage(mockFetch({}, 500));
    await waitFor(() => {
      expect(screen.getByText(/Hata:/)).toBeDefined();
    });
  });

  it("shows empty state when no links", async () => {
    renderPage(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz template style link yok.")).toBeDefined();
    });
  });

  it("displays link list after data loads", async () => {
    renderPage(mockFetch([MOCK_LINK]));
    await waitFor(() => {
      expect(screen.getByText("primary")).toBeDefined();
    });
  });

  it("shows status badge", async () => {
    renderPage(mockFetch([MOCK_LINK]));
    await waitFor(() => {
      expect(screen.getByText("active")).toBeDefined();
    });
  });

  it("shows no detail panel when nothing is selected", async () => {
    renderPage(mockFetch([]));
    await waitFor(() => {
      expect(screen.queryByTestId("tsl-detail-heading")).toBeNull();
    });
  });

  it("opens detail panel when a link is clicked", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_LINK]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/template-style-links", element: <TemplateStyleLinksRegistryPage /> }],
      { initialEntries: ["/admin/template-style-links"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("primary")).toBeDefined());
    await user.click(screen.getByText("primary"));
    await waitFor(() => {
      expect(screen.getByTestId("tsl-detail-heading")).toBeDefined();
    });
  });
});
