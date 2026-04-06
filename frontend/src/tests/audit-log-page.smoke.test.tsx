import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditLogPage } from "../pages/admin/AuditLogPage";

const MOCK_AUDIT_LIST = {
  items: [
    {
      id: "a1",
      actor_type: "admin",
      actor_id: "admin-1",
      action: "setting.update",
      entity_type: "setting",
      entity_id: "set-1",
      details_json: '{"old":"v1","new":"v2"}',
      created_at: "2026-04-01T12:00:00Z",
    },
    {
      id: "a2",
      actor_type: "system",
      actor_id: null,
      action: "visibility_rule.create",
      entity_type: "visibility_rule",
      entity_id: "vr-1",
      details_json: '{"key":"panel:test"}',
      created_at: "2026-04-01T12:05:00Z",
    },
  ],
  total: 2,
};

const MOCK_AUDIT_DETAIL = {
  id: "a1",
  actor_type: "admin",
  actor_id: "admin-1",
  action: "setting.update",
  entity_type: "setting",
  entity_id: "set-1",
  details_json: '{"old":"v1","new":"v2"}',
  created_at: "2026-04-01T12:00:00Z",
};

function renderAuditPage(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/audit-logs", element: <AuditLogPage /> }],
    { initialEntries: ["/admin/audit-logs"] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Audit Log Page smoke tests", () => {
  it("renders page heading", async () => {
    renderAuditPage(
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_AUDIT_LIST),
      }),
    );
    expect(screen.getByText("Audit Log")).toBeDefined();
  });

  it("shows loading state", () => {
    renderAuditPage(vi.fn().mockReturnValue(new Promise(() => {})));
    // Loading state now shows skeleton shimmer instead of text
    const skeletons = document.querySelectorAll(".skeleton-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders audit log table with records", async () => {
    renderAuditPage(
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_AUDIT_LIST),
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("audit-log-table")).toBeDefined();
      expect(screen.getByText("setting.update")).toBeDefined();
      expect(screen.getByText("visibility_rule.create")).toBeDefined();
    });
  });

  it("shows empty state when no records", async () => {
    renderAuditPage(
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], total: 0 }),
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("audit-empty")).toBeDefined();
    });
  });

  it("shows filter inputs", () => {
    renderAuditPage(vi.fn().mockReturnValue(new Promise(() => {})));
    expect(screen.getByTestId("audit-action-filter")).toBeDefined();
    expect(screen.getByTestId("audit-entity-type-filter")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    renderAuditPage(
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Hata:/)).toBeDefined();
    });
  });
});
