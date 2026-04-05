import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { ContentLibraryPage } from "../pages/admin/ContentLibraryPage";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_VIDEOS = [
  {
    id: "sv-1",
    title: "Test Video 1",
    topic: "Test Topic",
    status: "draft",
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "sv-2",
    title: "Test Video 2",
    topic: null,
    status: "ready",
    created_at: "2026-04-02T10:00:00Z",
  },
];

const MOCK_BULLETINS = [
  {
    id: "nb-1",
    title: "Test Bulletin 1",
    topic: "News Topic",
    status: "draft",
    created_at: "2026-04-03T10:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderLibrary() {
  window.fetch = vi.fn((url: string) => {
    let data: unknown = [];
    if (typeof url === "string" && url.includes("standard-video")) {
      data = MOCK_VIDEOS;
    } else if (typeof url === "string" && url.includes("news-bulletin")) {
      data = MOCK_BULLETINS;
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });
  }) as unknown as typeof window.fetch;

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { path: "library", element: <ContentLibraryPage /> },
        ],
      },
    ],
    { initialEntries: ["/admin/library"] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/*  M20-C: Content Library Operations                                  */
/* ------------------------------------------------------------------ */

describe("M20-C: Content Library Operations", () => {
  it("library heading is present", () => {
    renderLibrary();
    expect(screen.getByTestId("library-heading").textContent).toBe("Icerik Kutuphanesi");
  });

  it("library has filter area with search, type and status filters", () => {
    renderLibrary();
    expect(screen.getByTestId("library-filter-area")).toBeDefined();
    expect(screen.getByTestId("library-search-input")).toBeDefined();
    expect(screen.getByTestId("library-type-filter")).toBeDefined();
    expect(screen.getByTestId("library-status-filter")).toBeDefined();
  });

  it("library renders combined content from both modules", async () => {
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByTestId("library-table")).toBeDefined();
    });
    expect(screen.getByText("Test Video 1")).toBeDefined();
    expect(screen.getByText("Test Bulletin 1")).toBeDefined();
  });

  it("library filter note mentions backend tarafinda", () => {
    renderLibrary();
    const note = screen.getByTestId("library-filter-note");
    expect(note.textContent).toContain("backend tarafinda");
  });

  it("library actions area does not contain ilerideki fazlarda", async () => {
    renderLibrary();
    const actionsArea = screen.getByTestId("library-actions-area");
    expect(actionsArea.textContent).not.toContain("Ilerideki fazlarda");
    expect(actionsArea.textContent).not.toContain("ilerideki fazlarda");
  });

  it("library has clear filter button when filters active", () => {
    renderLibrary();
    // Type a search query
    const input = screen.getByTestId("library-search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    expect(screen.getByTestId("library-filter-clear")).toBeDefined();
  });

  it("detail buttons navigate correctly", async () => {
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByTestId("library-table")).toBeDefined();
    });
    // All rows have a "Detay Goruntule" link
    const detailLinks = screen.getAllByText("Detay Goruntule →");
    expect(detailLinks.length).toBe(3); // 2 videos + 1 bulletin
  });

  it("library workflow note is present", () => {
    renderLibrary();
    expect(screen.getByTestId("library-workflow-note")).toBeDefined();
    expect(screen.getByTestId("library-workflow-note").textContent).toContain("Icerik yonetim zinciri");
  });
});
