/**
 * M13-A Visibility Enforcement smoke tests.
 *
 * Tests for:
 *   - useVisibility hook returns default resolution when API fails
 *   - resolveVisibility constructs correct URL with query params
 *   - Visibility-hidden nav item is not rendered in sidebar
 *   - Visibility-visible nav item is rendered in sidebar
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resolveVisibility } from "../api/visibilityApi";
import { AdminLayout } from "../app/layouts/AdminLayout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithRouter(element: React.ReactElement, path = "/admin") {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [{ path: "/admin", element }],
    { initialEntries: [path] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests: resolveVisibility API function
// ---------------------------------------------------------------------------

describe("resolveVisibility", () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  it("constructs correct URL with target_key and optional params", async () => {
    const calls: string[] = [];
    window.fetch = vi.fn((url: string | URL | Request) => {
      calls.push(String(url));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }),
      });
    }) as unknown as typeof window.fetch;

    await resolveVisibility("panel:settings", { role: "admin", mode: "guided" });

    expect(calls.length).toBe(1);
    const callUrl = calls[0];
    expect(callUrl).toContain("/api/v1/visibility-rules/resolve?");
    expect(callUrl).toContain("target_key=panel%3Asettings");
    expect(callUrl).toContain("role=admin");
    expect(callUrl).toContain("mode=guided");
  });

  it("throws on API error instead of returning permissive defaults (M22-A)", async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as unknown as typeof window.fetch;

    await expect(resolveVisibility("panel:settings")).rejects.toThrow(
      "HTTP 500"
    );
  });

  it("omits optional params when not provided", async () => {
    const calls: string[] = [];
    window.fetch = vi.fn((url: string | URL | Request) => {
      calls.push(String(url));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }),
      });
    }) as unknown as typeof window.fetch;

    await resolveVisibility("panel:jobs");

    const callUrl = calls[0];
    expect(callUrl).toContain("target_key=panel%3Ajobs");
    expect(callUrl).not.toContain("role=");
    expect(callUrl).not.toContain("mode=");
    expect(callUrl).not.toContain("module_scope=");
  });
});

// ---------------------------------------------------------------------------
// Tests: AdminLayout sidebar visibility filtering
// ---------------------------------------------------------------------------

describe("AdminLayout sidebar visibility", () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  it("hides nav item when visibility resolve returns visible=false", async () => {
    window.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/resolve") && urlStr.includes("panel%3Asettings")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ visible: false, read_only: false, wizard_visible: false }),
        });
      }
      // All other visibility checks return visible
      if (urlStr.includes("/resolve")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as unknown as typeof window.fetch;

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/admin", element: <AdminLayout /> }],
      { initialEntries: ["/admin"] },
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Wait for visibility queries to resolve
    await waitFor(() => {
      // "Ayarlar" (Settings) should be hidden
      expect(screen.queryByText("Ayarlar")).toBeNull();
    });

    // "Isler" (Jobs) has no visibility guard, so it should always be visible
    expect(screen.getByText("Isler")).toBeDefined();
  });

  it("shows nav item when visibility resolve returns visible=true", async () => {
    window.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/resolve")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ visible: true, read_only: false, wizard_visible: false }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as unknown as typeof window.fetch;

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/admin", element: <AdminLayout /> }],
      { initialEntries: ["/admin"] },
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      // "Ayarlar" (Settings) should be visible
      expect(screen.getByText("Ayarlar")).toBeDefined();
      // "Kaynaklar" (Sources) should be visible
      expect(screen.getByText("Kaynaklar")).toBeDefined();
      // "Sablonlar" (Templates) should be visible
      expect(screen.getByText("Sablonlar")).toBeDefined();
      // "Isler" (Jobs) — no guard — should be visible
      expect(screen.getByText("Isler")).toBeDefined();
    });
  });

  it("shows all unguarded nav items even when API errors", async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as unknown as typeof window.fetch;

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: "/admin", element: <AdminLayout /> }],
      { initialEntries: ["/admin"] },
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Unguarded items always visible; guarded items default to visible on error
    await waitFor(() => {
      expect(screen.getByText("Isler")).toBeDefined();
      expect(screen.getByText("Genel Bakis")).toBeDefined();
    });
  });
});
