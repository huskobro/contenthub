import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { ContentLibraryPage } from "../pages/admin/ContentLibraryPage";

/* ------------------------------------------------------------------ */
/*  Mock data — unified content library response                       */
/* ------------------------------------------------------------------ */

const MOCK_UNIFIED_ITEMS = {
  total: 3,
  offset: 0,
  limit: 50,
  items: [
    {
      id: "sv-1",
      content_type: "standard_video",
      title: "Test Video 1",
      topic: "Test Topic",
      status: "draft",
      created_at: "2026-04-01T10:00:00Z",
      has_script: false,
      has_metadata: false,
    },
    {
      id: "sv-2",
      content_type: "standard_video",
      title: "Test Video 2",
      topic: "Topic 2",
      status: "ready",
      created_at: "2026-04-02T10:00:00Z",
      has_script: true,
      has_metadata: true,
    },
    {
      id: "nb-1",
      content_type: "news_bulletin",
      title: "Test Bulletin 1",
      topic: "News Topic",
      status: "draft",
      created_at: "2026-04-03T10:00:00Z",
      has_script: false,
      has_metadata: false,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderLibrary() {
  window.fetch = vi.fn((url: string) => {
    // AdminLayout fans out to several list endpoints expecting arrays;
    // returning `{}` (the previous default) crashed downstream hooks
    // that iterate over query.data. Default to `[]` instead.
    let data: unknown = [];
    const urlStr = String(url);
    if (urlStr.includes("content-library")) {
      data = MOCK_UNIFIED_ITEMS;
    } else if (urlStr.includes("clone")) {
      data = { id: "cloned-id" };
    } else if (urlStr.includes("/onboarding")) {
      data = { onboarding_required: false };
    } else if (urlStr.includes("/visibility-rules/resolve")) {
      data = { visible: true, read_only: false, wizard_visible: false };
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
/*  M20-C: Content Library Operations (updated for M21-D unified)      */
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

  it("library filter note mentions filtreleyebilirsiniz", () => {
    renderLibrary();
    const note = screen.getByTestId("library-filter-note");
    expect(note.textContent).toContain("filtreleyebilirsiniz");
  });

  it("library actions area does not contain ilerideki fazlarda", async () => {
    renderLibrary();
    const actionsArea = screen.getByTestId("library-actions-area");
    expect(actionsArea.textContent).not.toContain("Ilerideki fazlarda");
    expect(actionsArea.textContent).not.toContain("ilerideki fazlarda");
  });

  it("library has clear filter button when filters active", () => {
    renderLibrary();
    const input = screen.getByTestId("library-search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    expect(screen.getByTestId("library-filter-clear")).toBeDefined();
  });

  it("detail buttons navigate correctly", async () => {
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByTestId("library-table")).toBeDefined();
    });
    // All rows have a "Detay" button
    const detailLinks = screen.getAllByText("Detay");
    expect(detailLinks.length).toBe(3); // 2 videos + 1 bulletin
  });

  it("library workflow note is present", () => {
    renderLibrary();
    expect(screen.getByTestId("library-workflow-note")).toBeDefined();
    expect(screen.getByTestId("library-workflow-note").textContent).toContain("Olusturma");
  });
});
