import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { VisibilityRegistryPage } from "../pages/admin/VisibilityRegistryPage";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import type { VisibilityRuleResponse } from "../api/visibilityApi";

const MOCK_RULES: VisibilityRuleResponse[] = [
  {
    id: "r1",
    rule_type: "field",
    target_key: "user.email",
    module_scope: null,
    role_scope: "admin",
    mode_scope: null,
    visible: true,
    read_only: false,
    wizard_visible: true,
    status: "active",
    priority: 10,
    notes: "Admin can see email",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "r2",
    rule_type: "widget",
    target_key: "dashboard.stats",
    module_scope: "standard_video",
    role_scope: null,
    mode_scope: "advanced",
    visible: false,
    read_only: true,
    wizard_visible: false,
    status: "active",
    priority: 5,
    notes: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function renderVisibility(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const testRouter = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "visibility", element: <VisibilityRegistryPage /> },
        ],
      },
    ],
    { initialEntries: ["/admin/visibility"] }
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

describe("Visibility Registry smoke tests", () => {
  it("renders the visibility page at /admin/visibility", async () => {
    renderVisibility(mockFetch(MOCK_RULES));
    expect(screen.getByRole("heading", { name: "Visibility Registry" })).toBeDefined();
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const testRouter = createMemoryRouter(
      [
        {
          path: "/admin/visibility",
          element: <VisibilityRegistryPage />,
        },
      ],
      { initialEntries: ["/admin/visibility"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("displays rules list after data loads", async () => {
    renderVisibility(mockFetch(MOCK_RULES));
    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
      expect(screen.getByText("dashboard.stats")).toBeDefined();
    });
  });

  it("shows detail panel placeholder when no rule selected", async () => {
    renderVisibility(mockFetch(MOCK_RULES));
    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });
    expect(screen.getByText("Detay görmek için bir visibility rule seçin.")).toBeDefined();
  });

  it("shows detail panel when a rule is selected", async () => {
    const detailFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_RULES),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_RULES[0]),
      });

    renderVisibility(detailFetch);

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      expect(screen.getByText("Rule Detayı")).toBeDefined();
      expect(screen.getByText("Admin can see email")).toBeDefined();
    });
  });
});
