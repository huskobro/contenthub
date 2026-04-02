/**
 * Phase 51: News Bulletin Used News Warning UI smoke tests.
 *
 * Covers:
 *   A) UsedNewsWarningBadge hidden when warning=false
 *   B) UsedNewsWarningBadge visible when warning=true
 *   C) UsedNewsWarningDetails shows used_news_count
 *   D) UsedNewsWarningDetails shows last_usage_type
 *   E) UsedNewsWarningDetails shows last_target_module
 *   F) UsedNewsWarningDetails omits last_usage_type when null
 *   G) UsedNewsWarningDetails omits last_target_module when null
 *   H) Panel renders warning badge for item with warning=true
 *   I) Panel does not render warning badge for item with warning=false
 *   J) Panel does not break when enforcement fields are absent
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { UsedNewsWarningBadge } from "../components/news-bulletin/UsedNewsWarningBadge";
import { UsedNewsWarningDetails } from "../components/news-bulletin/UsedNewsWarningDetails";
import { NewsBulletinSelectedItemsPanel } from "../components/news-bulletin/NewsBulletinSelectedItemsPanel";

vi.mock("../api/newsBulletinApi", () => ({
  fetchNewsBulletinSelectedItems: vi.fn(),
  createNewsBulletinSelectedItem: vi.fn(),
  updateNewsBulletinSelectedItem: vi.fn(),
}));
vi.mock("../api/newsItemsApi", () => ({
  fetchNewsItems: vi.fn().mockResolvedValue([]),
}));

import { fetchNewsBulletinSelectedItems } from "../api/newsBulletinApi";
const mockFetch = fetchNewsBulletinSelectedItems as ReturnType<typeof vi.fn>;

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPanel(bulletinId: string, qc: QueryClient) {
  const router = createMemoryRouter([
    { path: "/", element: <NewsBulletinSelectedItemsPanel bulletinId={bulletinId} /> },
  ]);
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

// ── A) badge hidden when warning=false ────────────────────────────────────────
describe("UsedNewsWarningBadge", () => {
  it("A) does not render when warning=false", () => {
    const { container } = render(<UsedNewsWarningBadge warning={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("B) renders when warning=true", () => {
    render(<UsedNewsWarningBadge warning={true} />);
    expect(screen.getByText("Kullanım kaydı var")).toBeTruthy();
  });
});

// ── UsedNewsWarningDetails ─────────────────────────────────────────────────────
describe("UsedNewsWarningDetails", () => {
  it("C) shows used_news_count", () => {
    render(<UsedNewsWarningDetails usedNewsCount={3} />);
    expect(screen.getByText(/Kullanım: 3x/)).toBeTruthy();
  });

  it("D) shows last_usage_type when provided", () => {
    render(<UsedNewsWarningDetails usedNewsCount={1} lastUsageType="bulletin" />);
    expect(screen.getByText(/Tür: bulletin/)).toBeTruthy();
  });

  it("E) shows last_target_module when provided", () => {
    render(<UsedNewsWarningDetails usedNewsCount={1} lastTargetModule="news_bulletin" />);
    expect(screen.getByText(/Modül: news_bulletin/)).toBeTruthy();
  });

  it("F) omits last_usage_type when null", () => {
    render(<UsedNewsWarningDetails usedNewsCount={1} lastUsageType={null} />);
    expect(screen.queryByText(/Tür:/)).toBeNull();
  });

  it("G) omits last_target_module when null", () => {
    render(<UsedNewsWarningDetails usedNewsCount={1} lastTargetModule={null} />);
    expect(screen.queryByText(/Modül:/)).toBeNull();
  });
});

// ── Panel integration ──────────────────────────────────────────────────────────
describe("NewsBulletinSelectedItemsPanel warning integration", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("H) renders warning badge for item with used_news_warning=true", async () => {
    mockFetch.mockResolvedValue([
      {
        id: "sel-1",
        news_bulletin_id: "bul-1",
        news_item_id: "ni-1",
        sort_order: 1,
        selection_reason: null,
        created_at: "2026-04-02T10:00:00Z",
        updated_at: "2026-04-02T10:00:00Z",
        used_news_count: 2,
        used_news_warning: true,
        last_usage_type: "bulletin",
        last_target_module: "news_bulletin",
      },
    ]);
    const qc = makeQC();
    renderPanel("bul-1", qc);
    expect(await screen.findByText("Kullanım kaydı var")).toBeTruthy();
  });

  it("I) does not render warning badge for item with used_news_warning=false", async () => {
    mockFetch.mockResolvedValue([
      {
        id: "sel-2",
        news_bulletin_id: "bul-2",
        news_item_id: "ni-2",
        sort_order: 1,
        selection_reason: null,
        created_at: "2026-04-02T10:00:00Z",
        updated_at: "2026-04-02T10:00:00Z",
        used_news_count: 0,
        used_news_warning: false,
        last_usage_type: null,
        last_target_module: null,
      },
    ]);
    const qc = makeQC();
    renderPanel("bul-2", qc);
    await screen.findByText("ni-2");
    expect(screen.queryByText("Kullanım kaydı var")).toBeNull();
  });

  it("J) panel does not break when enforcement fields are absent", async () => {
    mockFetch.mockResolvedValue([
      {
        id: "sel-3",
        news_bulletin_id: "bul-3",
        news_item_id: "ni-3",
        sort_order: 1,
        selection_reason: null,
        created_at: "2026-04-02T10:00:00Z",
        updated_at: "2026-04-02T10:00:00Z",
      },
    ]);
    const qc = makeQC();
    renderPanel("bul-3", qc);
    expect(await screen.findByText("ni-3")).toBeTruthy();
    expect(screen.queryByText("Kullanım kaydı var")).toBeNull();
  });
});
