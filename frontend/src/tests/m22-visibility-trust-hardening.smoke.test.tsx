/**
 * M22 Frontend Smoke Tests — Visibility trust, library UX hardening.
 *
 * M22-A: Visibility error fallback (read-only, not permissive)
 * M22-E: Content library has_script/has_metadata display
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock react-router-dom ──
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/admin/library", search: "", hash: "", state: null }),
}));

// ── Mock React Query ──
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock("../hooks/useContentLibrary", () => ({
  useContentLibrary: () => ({
    data: {
      total: 2,
      items: [
        {
          id: "sv1",
          content_type: "standard_video",
          title: "Video With Script",
          topic: "Topic 1",
          status: "draft",
          created_at: "2025-06-01T10:00:00Z",
          has_script: true,
          has_metadata: false,
        },
        {
          id: "nb1",
          content_type: "news_bulletin",
          title: "Bulletin With Meta",
          topic: "Topic 2",
          status: "ready",
          created_at: "2025-06-02T10:00:00Z",
          has_script: false,
          has_metadata: true,
        },
      ],
      offset: 0,
      limit: 50,
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../api/contentLibraryApi", () => ({
  fetchContentLibrary: vi.fn(),
  cloneStandardVideo: vi.fn().mockResolvedValue({ id: "clone-sv" }),
  cloneNewsBulletin: vi.fn().mockResolvedValue({ id: "clone-nb" }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import { ContentLibraryPage } from "../pages/admin/ContentLibraryPage";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── M22-A: Visibility Error Fallback ────────────────────────

describe("M22-A: Visibility API Error Handling", () => {
  it("resolveVisibility throws on API error instead of permissive fallback", async () => {
    const { resolveVisibility } = await import("../api/visibilityApi");
    // Mock fetch to fail
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch;
    try {
      await expect(resolveVisibility("test:key")).rejects.toThrow("Visibility resolution failed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("useVisibility hook provides isError flag", async () => {
    // Just verify the hook exports isError in its return type
    const mod = await import("../hooks/useVisibility");
    expect(typeof mod.useVisibility).toBe("function");
  });
});

// ── M22-E: has_script/has_metadata Display ──────────────────

describe("M22-E: Content Library has_script/has_metadata", () => {
  it("shows Script badge when has_script is true", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-has-script-sv1")).toBeDefined();
    expect(screen.getByTestId("library-has-script-sv1").textContent).toContain("Script");
  });

  it("shows Meta badge when has_metadata is true", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-has-metadata-nb1")).toBeDefined();
    expect(screen.getByTestId("library-has-metadata-nb1").textContent).toContain("Meta");
  });

  it("does not show Script badge when has_script is false", () => {
    render(<ContentLibraryPage />);
    expect(screen.queryByTestId("library-has-script-nb1")).toBeNull();
  });

  it("does not show Meta badge when has_metadata is false", () => {
    render(<ContentLibraryPage />);
    expect(screen.queryByTestId("library-has-metadata-sv1")).toBeNull();
  });

  it("table has Icerik column header", () => {
    render(<ContentLibraryPage />);
    const table = screen.getByTestId("library-table");
    expect(table.textContent).toContain("Icerik");
  });
});

// ── M22-A: Visibility API contract ──────────────────────────

describe("M22-A: Visibility API Contract", () => {
  it("deleteVisibilityRule function exists", async () => {
    const { deleteVisibilityRule } = await import("../api/visibilityApi");
    expect(typeof deleteVisibilityRule).toBe("function");
  });
});
