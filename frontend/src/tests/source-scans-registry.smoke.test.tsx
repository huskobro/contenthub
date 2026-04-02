import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SourceScansRegistryPage } from "../pages/admin/SourceScansRegistryPage";
import type { SourceScanResponse } from "../api/sourceScansApi";

const MOCK_SCANS: SourceScanResponse[] = [
  {
    id: "scan-1",
    source_id: "src-1-abcdef",
    scan_mode: "manual",
    status: "completed",
    requested_by: "admin",
    started_at: "2026-04-02T10:00:00Z",
    finished_at: "2026-04-02T10:01:00Z",
    result_count: 12,
    error_summary: null,
    raw_result_preview_json: '{"items":["a","b"]}',
    notes: "First manual scan",
    created_at: "2026-04-02T10:00:00Z",
    updated_at: "2026-04-02T10:01:00Z",
  },
  {
    id: "scan-2",
    source_id: "src-2-ghijkl",
    scan_mode: "auto",
    status: "failed",
    requested_by: null,
    started_at: "2026-04-02T11:00:00Z",
    finished_at: null,
    result_count: null,
    error_summary: "Connection timeout",
    raw_result_preview_json: null,
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
    [{ path: "/admin/source-scans", element: <SourceScansRegistryPage /> }],
    { initialEntries: ["/admin/source-scans"] }
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

describe("Source Scans Registry smoke tests", () => {
  it("renders the page heading", () => {
    renderRegistry(mockFetch(MOCK_SCANS));
    expect(screen.getByRole("heading", { name: "Source Scans Registry" })).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/source-scans", element: <SourceScansRegistryPage /> }],
      { initialEntries: ["/admin/source-scans"] }
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
      [{ path: "/admin/source-scans", element: <SourceScansRegistryPage /> }],
      { initialEntries: ["/admin/source-scans"] }
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

  it("shows empty state when no scans", async () => {
    renderRegistry(mockFetch([]));
    await waitFor(() => {
      expect(screen.getByText("Henüz scan kaydı yok.")).toBeDefined();
    });
  });

  it("displays scan list after data loads", async () => {
    renderRegistry(mockFetch(MOCK_SCANS));
    await waitFor(() => {
      expect(screen.getByText("manual")).toBeDefined();
      expect(screen.getByText("auto")).toBeDefined();
    });
  });

  it("shows status column values", async () => {
    renderRegistry(mockFetch(MOCK_SCANS));
    await waitFor(() => {
      expect(screen.getByText("completed")).toBeDefined();
      expect(screen.getByText("failed")).toBeDefined();
    });
  });

  it("shows no detail panel when nothing is selected", async () => {
    renderRegistry(mockFetch(MOCK_SCANS));
    await waitFor(() => {
      expect(screen.getByText("Bir scan kaydı seçin.")).toBeDefined();
    });
  });

  it("shows detail panel loading state after selection", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCANS) });
      }
      return new Promise(() => {}); // detail never resolves
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/source-scans", element: <SourceScansRegistryPage /> }],
      { initialEntries: ["/admin/source-scans"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("manual")).toBeDefined());
    // Click the first row (manual scan)
    await user.click(screen.getAllByText("manual")[0]);
    await waitFor(() => {
      expect(screen.getByText("Yükleniyor...")).toBeDefined();
    });
  });

  it("shows detail panel data after selecting a scan", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCANS) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCANS[0]) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/source-scans", element: <SourceScansRegistryPage /> }],
      { initialEntries: ["/admin/source-scans"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("manual")).toBeDefined());
    await user.click(screen.getAllByText("manual")[0]);
    await waitFor(() => {
      expect(screen.getByText("Scan Detayı")).toBeDefined();
    });
  });
});
