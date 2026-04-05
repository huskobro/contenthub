/**
 * M21 Frontend Smoke Tests — Upload, Clone, Unified Library
 *
 * M21-A: Asset upload UI elements
 * M21-B: Upload surface in AssetLibraryPage
 * M21-C: Clone button in ContentLibraryPage
 * M21-D: Unified content library page using backend endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock react-router-dom ──
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/admin/library", search: "", hash: "", state: null }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

// ── Mock React Query ──
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: (opts: { queryKey: unknown[]; queryFn: () => Promise<unknown> }) => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
}));

// ── Mock hooks ──
vi.mock("../hooks/useAssetList", () => ({
  useAssetList: () => ({
    data: {
      total: 2,
      items: [
        {
          id: "a1",
          name: "test.mp3",
          asset_type: "audio",
          source_kind: "job_artifact",
          file_path: "/workspace/test.mp3",
          size_bytes: 1024,
          mime_ext: "mp3",
          job_id: null,
          module_type: null,
          discovered_at: "2025-01-01T00:00:00Z",
        },
      ],
      offset: 0,
      limit: 50,
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../hooks/useContentLibrary", () => ({
  useContentLibrary: () => ({
    data: {
      total: 2,
      items: [
        {
          id: "sv1",
          content_type: "standard_video",
          title: "Test Video",
          topic: "Konu 1",
          status: "draft",
          created_at: "2025-06-01T10:00:00Z",
          has_script: false,
          has_metadata: false,
        },
        {
          id: "nb1",
          content_type: "news_bulletin",
          title: "Test Bulten",
          topic: "Konu 2",
          status: "ready",
          created_at: "2025-06-02T10:00:00Z",
          has_script: true,
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

vi.mock("../api/assetApi", () => ({
  refreshAssets: vi.fn().mockResolvedValue({ message: "Tarama tamamlandi", total_scanned: 5 }),
  deleteAsset: vi.fn().mockResolvedValue({ status: "deleted", message: "Silindi" }),
  revealAsset: vi.fn().mockResolvedValue({ absolute_path: "/a/b", directory: "/a", exists: true }),
  uploadAsset: vi.fn().mockResolvedValue({ status: "uploaded", name: "file.mp3", message: "Basarili" }),
}));

vi.mock("../api/contentLibraryApi", () => ({
  fetchContentLibrary: vi.fn(),
  cloneStandardVideo: vi.fn().mockResolvedValue({ id: "new-sv" }),
  cloneNewsBulletin: vi.fn().mockResolvedValue({ id: "new-nb" }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import { AssetLibraryPage } from "../pages/admin/AssetLibraryPage";
import { ContentLibraryPage } from "../pages/admin/ContentLibraryPage";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── M21-B: Asset Upload Surface ─────────────────────────────

describe("M21-B: AssetLibraryPage Upload Surface", () => {
  it("renders upload area", () => {
    render(<AssetLibraryPage />);
    expect(screen.getByTestId("asset-upload-area")).toBeDefined();
    expect(screen.getByTestId("asset-upload-heading").textContent).toContain("Dosya Yukle");
  });

  it("renders file input", () => {
    render(<AssetLibraryPage />);
    const input = screen.getByTestId("asset-upload-input");
    expect(input).toBeDefined();
    expect(input.getAttribute("type")).toBe("file");
  });

  it("renders upload button", () => {
    render(<AssetLibraryPage />);
    const btn = screen.getByTestId("asset-upload-btn");
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain("Yukle");
  });

  it("upload button is not disabled by default", () => {
    render(<AssetLibraryPage />);
    const btn = screen.getByTestId("asset-upload-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ── M21-D: Unified Content Library ──────────────────────────

describe("M21-D: ContentLibraryPage Unified", () => {
  it("renders heading", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-heading").textContent).toContain("Icerik Kutuphanesi");
  });

  it("renders filter area", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-filter-area")).toBeDefined();
  });

  it("renders content list section", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-content-list")).toBeDefined();
  });

  it("renders table with items from unified endpoint", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-table")).toBeDefined();
  });

  it("displays total count", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-total-count").textContent).toContain("Toplam: 2");
  });

  it("renders actions area with clone description", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-actions-area")).toBeDefined();
    expect(screen.getByTestId("action-clone")).toBeDefined();
  });
});

// ── M21-C: Clone Buttons ────────────────────────────────────

describe("M21-C: ContentLibraryPage Clone Buttons", () => {
  it("renders clone button for each item", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-clone-sv1")).toBeDefined();
    expect(screen.getByTestId("library-clone-nb1")).toBeDefined();
  });

  it("clone buttons show 'Klonla' text", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-clone-sv1").textContent).toContain("Klonla");
    expect(screen.getByTestId("library-clone-nb1").textContent).toContain("Klonla");
  });

  it("renders detail buttons for each item", () => {
    render(<ContentLibraryPage />);
    expect(screen.getByTestId("library-detail-sv1")).toBeDefined();
    expect(screen.getByTestId("library-detail-nb1")).toBeDefined();
  });
});

// ── M21-A: Upload API contract ──────────────────────────────

describe("M21-A: Asset Upload API Contract", () => {
  it("uploadAsset function exists and is callable", async () => {
    const { uploadAsset } = await import("../api/assetApi");
    expect(typeof uploadAsset).toBe("function");
  });
});

// ── M21-D: Content Library API contract ─────────────────────

describe("M21-D: Content Library API Contract", () => {
  it("fetchContentLibrary function exists", async () => {
    const { fetchContentLibrary } = await import("../api/contentLibraryApi");
    expect(typeof fetchContentLibrary).toBe("function");
  });

  it("clone functions exist", async () => {
    const { cloneStandardVideo, cloneNewsBulletin } = await import("../api/contentLibraryApi");
    expect(typeof cloneStandardVideo).toBe("function");
    expect(typeof cloneNewsBulletin).toBe("function");
  });
});
