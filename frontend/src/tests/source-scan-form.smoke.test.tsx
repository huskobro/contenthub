import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SourceScanCreatePage } from "../pages/admin/SourceScanCreatePage";
import { SourceScansRegistryPage } from "../pages/admin/SourceScansRegistryPage";
import type { SourceScanResponse } from "../api/sourceScansApi";

const MOCK_SCAN: SourceScanResponse = {
  id: "scan-1",
  source_id: "src-abc-123",
  scan_mode: "manual",
  status: "queued",
  requested_by: "admin",
  started_at: null,
  finished_at: null,
  result_count: null,
  error_summary: null,
  raw_result_preview_json: null,
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
};

function makeRouter(
  fetchFn: typeof window.fetch,
  initialPath = "/admin/source-scans/new"
) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [
      { path: "/admin/source-scans/new", element: <SourceScanCreatePage /> },
      { path: "/admin/source-scans", element: <SourceScansRegistryPage /> },
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

describe("SourceScan form smoke tests", () => {
  it("renders the create page heading", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCAN) }));
    expect(screen.getByRole("heading", { name: "Yeni Source Scan" })).toBeDefined();
  });

  it("shows source_id required error on empty submit", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCAN) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Source ID zorunlu")).toBeDefined();
    });
  });

  it("cancel button is present on create page", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCAN) }));
    expect(screen.getByRole("button", { name: "İptal" })).toBeDefined();
  });

  it("submit button is present on create page", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCAN) }));
    expect(screen.getByRole("button", { name: "Oluştur" })).toBeDefined();
  });

  it("registry page shows Yeni button", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
      "/admin/source-scans"
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Yeni" })).toBeDefined();
    });
  });

  it("registry page shows scan in list after load", async () => {
    // `/source-scans` list endpoint now returns a pagination envelope
    // `{ items, total, offset, limit }` (post Gate Sources Closure);
    // useSourceScansList extracts `.items`, so tests must wrap arrays.
    makeRouter(
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [MOCK_SCAN], total: 1, offset: 0, limit: 50 }),
      }),
      "/admin/source-scans"
    );
    await waitFor(() => {
      expect(screen.getByText("manual")).toBeDefined();
    });
  });

  it("detail panel shows Düzenle button when item selected", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // pagination envelope — see comment above.
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [MOCK_SCAN], total: 1, offset: 0, limit: 50 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCAN) });
    });
    makeRouter(fetchFn, "/admin/source-scans");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("manual")).toBeDefined());
    await user.click(screen.getByText("manual"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("edit mode opens when Düzenle is clicked", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [MOCK_SCAN], total: 1, offset: 0, limit: 50 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCAN) });
    });
    makeRouter(fetchFn, "/admin/source-scans");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("manual")).toBeDefined());
    await user.click(screen.getByText("manual"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Scan Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes edit mode", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [MOCK_SCAN], total: 1, offset: 0, limit: 50 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCAN) });
    });
    makeRouter(fetchFn, "/admin/source-scans");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("manual")).toBeDefined());
    await user.click(screen.getByText("manual"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Scan Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Scan Düzenle" })).toBeNull();
    });
  });

  it("result_count invalid value shows error", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_SCAN) }));
    const user = userEvent.setup();
    const sourceIdInput = screen.getByPlaceholderText("Source UUID");
    await user.type(sourceIdInput, "test-source-id");
    const resultCountInput = screen.getByPlaceholderText("Sayı (opsiyonel)");
    await user.type(resultCountInput, "-5");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Result count negatif olamaz")).toBeDefined();
    });
  });
});
