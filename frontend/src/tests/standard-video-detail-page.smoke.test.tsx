import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StandardVideoDetailPage } from "../pages/admin/StandardVideoDetailPage";
import type {
  StandardVideoResponse,
  StandardVideoScriptResponse,
  StandardVideoMetadataResponse,
} from "../api/standardVideoApi";

const MOCK_VIDEO: StandardVideoResponse = {
  id: "sv1",
  title: "Test Video",
  topic: "Yapay Zeka ve Gelecek",
  brief: "Kısa açıklama",
  target_duration_seconds: 180,
  tone: "formal",
  language: "tr",
  visual_direction: "clean",
  subtitle_style: "standard",
  status: "metadata_ready",
  job_id: null,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:05:00Z",
  template_id: null,
  style_blueprint_id: null,
};

const MOCK_SCRIPT: StandardVideoScriptResponse = {
  id: "sc1",
  standard_video_id: "sv1",
  content: "Bu videonun scripti burada yer almaktadır. Detaylı içerik yazılacak.",
  version: 1,
  source_type: "manual",
  generation_status: "ready",
  notes: null,
  created_at: "2026-04-01T10:01:00Z",
  updated_at: "2026-04-01T10:01:00Z",
};

const MOCK_METADATA: StandardVideoMetadataResponse = {
  id: "md1",
  standard_video_id: "sv1",
  title: "Yapay Zeka ve Geleceğimiz",
  description: "Detaylı açıklama",
  tags_json: '["ai", "technology"]',
  category: "education",
  language: "tr",
  version: 1,
  source_type: "manual",
  generation_status: "ready",
  notes: null,
  created_at: "2026-04-01T10:02:00Z",
  updated_at: "2026-04-01T10:02:00Z",
};

function makeRouter(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [{ path: "/admin/standard-videos/:itemId", element: <StandardVideoDetailPage /> }],
    { initialEntries: ["/admin/standard-videos/sv1"] }
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>
  );
}

function mockAllFetch(
  video: unknown,
  script: unknown,
  metadata: unknown,
  scriptStatus = 200,
  metaStatus = 200
) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.endsWith("/script")) {
      return Promise.resolve({
        ok: scriptStatus >= 200 && scriptStatus < 300,
        status: scriptStatus,
        json: () => Promise.resolve(script),
      });
    }
    if (url.endsWith("/metadata")) {
      return Promise.resolve({
        ok: metaStatus >= 200 && metaStatus < 300,
        status: metaStatus,
        json: () => Promise.resolve(metadata),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(video),
    });
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Standard Video Detail Page smoke tests", () => {
  it("renders the page heading", async () => {
    makeRouter(mockAllFetch(MOCK_VIDEO, MOCK_SCRIPT, MOCK_METADATA));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Standard Video Detayı" })).toBeDefined();
    });
  });

  it("shows loading state", () => {
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/standard-videos/:itemId", element: <StandardVideoDetailPage /> }],
      { initialEntries: ["/admin/standard-videos/sv1"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Yükleniyor...")).toBeDefined();
  });

  it("shows overview panel with video data", async () => {
    makeRouter(mockAllFetch(MOCK_VIDEO, MOCK_SCRIPT, MOCK_METADATA));
    await waitFor(() => {
      expect(screen.getByText("Genel Bilgi")).toBeDefined();
      expect(screen.getAllByText("Yapay Zeka ve Gelecek").length).toBeGreaterThan(0);
    });
  });

  it("shows script panel with script content when script exists", async () => {
    makeRouter(mockAllFetch(MOCK_VIDEO, MOCK_SCRIPT, MOCK_METADATA));
    await waitFor(() => {
      expect(screen.getAllByText("Script").length).toBeGreaterThan(0);
      // script content visible in read mode
      expect(screen.getByText("Bu videonun scripti burada yer almaktadır. Detaylı içerik yazılacak.")).toBeDefined();
    });
  });

  it("shows metadata panel when metadata exists", async () => {
    makeRouter(mockAllFetch(MOCK_VIDEO, MOCK_SCRIPT, MOCK_METADATA));
    await waitFor(() => {
      expect(screen.getAllByText("Metadata").length).toBeGreaterThan(0);
      expect(screen.getByText("Yapay Zeka ve Geleceğimiz")).toBeDefined();
    });
  });

  it("shows empty state when script and metadata are absent (404)", async () => {
    makeRouter(mockAllFetch(MOCK_VIDEO, null, null, 404, 404));
    await waitFor(() => {
      expect(screen.getByText("Henüz script yok.")).toBeDefined();
      expect(screen.getByText("Henüz metadata yok.")).toBeDefined();
    });
  });
});
