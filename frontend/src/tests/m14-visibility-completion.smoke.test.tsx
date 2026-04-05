/**
 * M14-A: Frontend Visibility Completion smoke tests.
 *
 * Tests for:
 *   - VisibilityGuard redirects when visible=false
 *   - VisibilityGuard allows access when visible=true
 *   - VisibilityGuard allows access on backend error (graceful degradation)
 *   - ReadOnlyGuard provides readOnly=false by default
 *   - ReadOnlyGuard provides readOnly=true when backend says read_only=true
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VisibilityGuard } from "../components/visibility/VisibilityGuard";
import { ReadOnlyGuard, useReadOnly } from "../components/visibility/ReadOnlyGuard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let originalFetch: typeof window.fetch;

function mockVisibility(rules: Record<string, { visible: boolean; read_only: boolean; wizard_visible: boolean }>) {
  window.fetch = vi.fn((url: string | URL | Request) => {
    const urlStr = String(url);

    // Handle visibility resolve requests
    if (urlStr.includes("/visibility-rules/resolve")) {
      const params = new URL(urlStr, "http://localhost").searchParams;
      const targetKey = params.get("target_key") || "";
      const rule = rules[targetKey] || { visible: true, read_only: false, wizard_visible: false };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(rule),
      });
    }

    // Default: return empty array/object for other endpoints
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
  }) as unknown as typeof window.fetch;
}

function renderWithRouter(path: string, routes: Parameters<typeof createMemoryRouter>[0]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  originalFetch = window.fetch;
});

afterEach(() => {
  window.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Minimal stub pages for testing
// ---------------------------------------------------------------------------

function StubOverviewPage() {
  return <div data-testid="admin-overview-heading">Genel Bakis</div>;
}

function StubSettingsPage() {
  return <div data-testid="settings-registry-heading">Ayarlar</div>;
}

function StubLayout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests: Page-level visibility guard
// ---------------------------------------------------------------------------

describe("M14-A: Page-level visibility guard", () => {
  it("VisibilityGuard hides children when visible=false", async () => {
    mockVisibility({ "panel:settings": { visible: false, read_only: false, wizard_visible: false } });

    const routes = [
      {
        path: "/admin",
        element: <StubLayout />,
        children: [
          { index: true, element: <StubOverviewPage /> },
          {
            path: "settings",
            element: (
              <VisibilityGuard targetKey="panel:settings">
                <StubSettingsPage />
              </VisibilityGuard>
            ),
          },
        ],
      },
    ];

    renderWithRouter("/admin/settings", routes);

    // The guarded page should NOT be rendered when visible=false
    await waitFor(() => {
      expect(screen.queryByTestId("settings-registry-heading")).toBeNull();
    });
  });

  it("VisibilityGuard allows access when visible=true", async () => {
    mockVisibility({ "panel:settings": { visible: true, read_only: false, wizard_visible: false } });

    const routes = [
      {
        path: "/admin",
        element: <StubLayout />,
        children: [
          { index: true, element: <StubOverviewPage /> },
          {
            path: "settings",
            element: (
              <VisibilityGuard targetKey="panel:settings">
                <StubSettingsPage />
              </VisibilityGuard>
            ),
          },
        ],
      },
    ];

    renderWithRouter("/admin/settings", routes);

    // Should render settings page, not redirect
    await waitFor(() => {
      expect(screen.getByTestId("settings-registry-heading")).toBeDefined();
    });
  });

  it("VisibilityGuard allows access on backend error (graceful degradation)", async () => {
    // Return error for all fetch calls
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    ) as unknown as typeof window.fetch;

    const routes = [
      {
        path: "/admin",
        element: <StubLayout />,
        children: [
          { index: true, element: <StubOverviewPage /> },
          {
            path: "settings",
            element: (
              <VisibilityGuard targetKey="panel:settings">
                <StubSettingsPage />
              </VisibilityGuard>
            ),
          },
        ],
      },
    ];

    renderWithRouter("/admin/settings", routes);

    // M22-A: Graceful degradation — visible defaults to true on error (retry=1 needs time)
    await waitFor(() => {
      expect(screen.getByTestId("settings-registry-heading")).toBeDefined();
    }, { timeout: 5000 });
  });

  it("VisibilityGuard shows nothing while loading", () => {
    // Never resolve fetch -- simulates perpetual loading
    window.fetch = vi.fn(
      () => new Promise(() => {}),
    ) as unknown as typeof window.fetch;

    const routes = [
      {
        path: "/admin",
        element: <StubLayout />,
        children: [
          { index: true, element: <StubOverviewPage /> },
          {
            path: "settings",
            element: (
              <VisibilityGuard targetKey="panel:settings">
                <StubSettingsPage />
              </VisibilityGuard>
            ),
          },
        ],
      },
    ];

    renderWithRouter("/admin/settings", routes);

    // While loading, neither page should be visible (no flash)
    expect(screen.queryByTestId("settings-registry-heading")).toBeNull();
    expect(screen.queryByTestId("admin-overview-heading")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: ReadOnly context
// ---------------------------------------------------------------------------

describe("M14-A: ReadOnly context", () => {
  function TestChild() {
    const ro = useReadOnly();
    return <span data-testid="ro-value">{String(ro)}</span>;
  }

  it("ReadOnlyGuard provides readOnly=false by default", async () => {
    mockVisibility({});

    const routes = [
      {
        path: "/test",
        element: (
          <ReadOnlyGuard targetKey="panel:settings">
            <TestChild />
          </ReadOnlyGuard>
        ),
      },
    ];

    renderWithRouter("/test", routes);

    await waitFor(() => {
      expect(screen.getByTestId("ro-value").textContent).toBe("false");
    });
  });

  it("ReadOnlyGuard provides readOnly=true when backend says read_only=true", async () => {
    mockVisibility({ "panel:settings": { visible: true, read_only: true, wizard_visible: false } });

    const routes = [
      {
        path: "/test",
        element: (
          <ReadOnlyGuard targetKey="panel:settings">
            <TestChild />
          </ReadOnlyGuard>
        ),
      },
    ];

    renderWithRouter("/test", routes);

    await waitFor(() => {
      expect(screen.getByTestId("ro-value").textContent).toBe("true");
    });
  });

  it("useReadOnly returns false when used outside ReadOnlyGuard", () => {
    const routes = [
      {
        path: "/test",
        element: <TestChild />,
      },
    ];

    renderWithRouter("/test", routes);

    // Default context value is readOnly=false
    expect(screen.getByTestId("ro-value").textContent).toBe("false");
  });
});
