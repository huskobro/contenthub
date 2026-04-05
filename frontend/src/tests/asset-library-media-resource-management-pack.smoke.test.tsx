import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { AssetLibraryPage } from "../pages/admin/AssetLibraryPage";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_ASSETS_RESPONSE = {
  total: 2,
  offset: 0,
  limit: 50,
  items: [
    {
      id: "job-1/artifacts/script.json",
      name: "script.json",
      asset_type: "data",
      source_kind: "job_artifact",
      file_path: "job-1/artifacts/script.json",
      size_bytes: 1024,
      mime_ext: "json",
      job_id: "job-1",
      module_type: "standard_video",
      discovered_at: "2026-04-01T10:00:00+00:00",
    },
    {
      id: "job-2/preview/thumb.png",
      name: "thumb.png",
      asset_type: "image",
      source_kind: "job_preview",
      file_path: "job-2/preview/thumb.png",
      size_bytes: 51200,
      mime_ext: "png",
      job_id: "job-2",
      module_type: "news_bulletin",
      discovered_at: "2026-04-02T12:00:00+00:00",
    },
  ],
};

const MOCK_ASSETS_EMPTY = {
  total: 0,
  offset: 0,
  limit: 50,
  items: [],
};

const MOCK_REFRESH_RESPONSE = {
  status: "ok",
  total_scanned: 2,
  message: "Workspace taramasi tamamlandi. 2 asset bulundu.",
};

const MOCK_DELETE_RESPONSE = {
  status: "deleted",
  asset_id: "job-1/artifacts/script.json",
  message: "Asset silindi: script.json",
};

const MOCK_REVEAL_RESPONSE = {
  asset_id: "job-1/artifacts/script.json",
  absolute_path: "/workspace/job-1/artifacts/script.json",
  directory: "/workspace/job-1/artifacts",
  exists: true,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderAdmin(path: string, assetsData: unknown = MOCK_ASSETS_RESPONSE) {
  window.fetch = vi.fn((url: string, opts?: RequestInit) => {
    const method = opts?.method ?? "GET";
    let data: unknown = assetsData;

    if (method === "POST" && typeof url === "string" && url.includes("/refresh")) {
      data = MOCK_REFRESH_RESPONSE;
    } else if (method === "DELETE") {
      data = MOCK_DELETE_RESPONSE;
    } else if (method === "POST" && typeof url === "string" && url.includes("/reveal")) {
      data = MOCK_REVEAL_RESPONSE;
    } else if (typeof url === "string" && url.includes("/allowed-actions")) {
      data = { asset_id: "test", actions: ["delete", "reveal", "refresh"] };
    } else if (typeof url === "string" && url.includes("/assets")) {
      data = assetsData;
    } else {
      data = [];
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
          { index: true, element: <AdminOverviewPage /> },
          { path: "assets", element: <AssetLibraryPage /> },
        ],
      },
    ],
    { initialEntries: [path] }
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
/*  Asset Library Entry Surface                                        */
/* ------------------------------------------------------------------ */

describe("Asset Library Entry Surface", () => {
  it("admin overview has asset library quick link", () => {
    renderAdmin("/admin");
    const card = screen.getByTestId("quick-link-assets");
    expect(card).toBeDefined();
    expect(card.textContent).toContain("Varlik Kutuphanesi");
  });

  it("asset library quick link desc mentions varlik types", () => {
    renderAdmin("/admin");
    const card = screen.getByTestId("quick-link-assets");
    expect(card.textContent).toContain("Muzik");
    expect(card.textContent).toContain("font");
    expect(card.textContent).toContain("gorsel");
  });

  it("admin sidebar has Varlik Kutuphanesi link", () => {
    renderAdmin("/admin");
    const links = screen.getAllByText("Varlik Kutuphanesi");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("admin overview release readiness includes Varlik Kutuphanesi with M21 aktif status", () => {
    renderAdmin("/admin");
    const item = screen.getByTestId("readiness-assets");
    expect(item).toBeDefined();
    expect(item.textContent).toContain("M21 aktif");
    expect(item.textContent).toContain("Varlik Kutuphanesi");
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Library — Real Data Rendering                                */
/* ------------------------------------------------------------------ */

describe("Asset Library Real Data Rendering", () => {
  it("asset library heading is correct", () => {
    renderAdmin("/admin/assets");
    const h = screen.getByTestId("asset-library-heading");
    expect(h.textContent).toBe("Varlik Kutuphanesi");
  });

  it("asset library has subtitle mentioning disk taramasi", () => {
    renderAdmin("/admin/assets");
    const sub = screen.getByTestId("asset-library-subtitle");
    expect(sub.textContent).toContain("disk taramasi");
  });

  it("asset library shows filter area", () => {
    renderAdmin("/admin/assets");
    expect(screen.getByTestId("asset-filter-area")).toBeDefined();
    expect(screen.getByTestId("asset-search-input")).toBeDefined();
    expect(screen.getByTestId("asset-type-filter")).toBeDefined();
  });

  it("asset library renders table with real data", async () => {
    renderAdmin("/admin/assets");
    await waitFor(() => {
      expect(screen.getByTestId("asset-table")).toBeDefined();
    });
    expect(screen.getByText("script.json")).toBeDefined();
    expect(screen.getByText("thumb.png")).toBeDefined();
  });

  it("asset library shows total count", async () => {
    renderAdmin("/admin/assets");
    await waitFor(() => {
      const count = screen.getByTestId("asset-total-count");
      expect(count.textContent).toContain("2");
    });
  });

  it("asset library shows pagination controls", async () => {
    renderAdmin("/admin/assets");
    await waitFor(() => {
      expect(screen.getByTestId("asset-pagination")).toBeDefined();
    });
  });

  it("unsupported badge no longer exists", () => {
    renderAdmin("/admin/assets");
    expect(screen.queryByTestId("asset-library-unsupported-badge")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Library — M20 Runtime Actions                                */
/* ------------------------------------------------------------------ */

describe("Asset Library M20 Runtime Actions", () => {
  it("asset library has refresh button", () => {
    renderAdmin("/admin/assets");
    expect(screen.getByTestId("asset-refresh-btn")).toBeDefined();
    expect(screen.getByTestId("asset-refresh-btn").textContent).toContain("Yenile");
  });

  it("asset table has Aksiyonlar column header", async () => {
    renderAdmin("/admin/assets");
    await waitFor(() => {
      expect(screen.getByTestId("asset-table")).toBeDefined();
    });
    expect(screen.getByText("Aksiyonlar")).toBeDefined();
  });

  it("each asset row has action buttons", async () => {
    renderAdmin("/admin/assets");
    await waitFor(() => {
      expect(screen.getByTestId("asset-table")).toBeDefined();
    });
    // First asset has reveal and delete buttons
    expect(screen.getByTestId("asset-reveal-job-1/artifacts/script.json")).toBeDefined();
    expect(screen.getByTestId("asset-delete-job-1/artifacts/script.json")).toBeDefined();
  });

  it("subtitle mentions silme capability", () => {
    renderAdmin("/admin/assets");
    const sub = screen.getByTestId("asset-library-subtitle");
    expect(sub.textContent).toContain("silebilirsiniz");
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Library — Empty State                                        */
/* ------------------------------------------------------------------ */

describe("Asset Library Empty State", () => {
  it("asset library shows empty state when no assets", async () => {
    renderAdmin("/admin/assets", MOCK_ASSETS_EMPTY);
    await waitFor(() => {
      const emptyState = screen.getByTestId("asset-library-empty-state");
      expect(emptyState).toBeDefined();
      expect(emptyState.textContent).toContain("henuz artifact");
    });
  });

  it("asset library does not render table when empty", async () => {
    renderAdmin("/admin/assets", MOCK_ASSETS_EMPTY);
    await waitFor(() => {
      expect(screen.getByTestId("asset-library-empty-state")).toBeDefined();
    });
    expect(screen.queryByTestId("asset-table")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Library — Admin Overview Verification                        */
/* ------------------------------------------------------------------ */

describe("Asset Library Verification — Admin Overview", () => {
  it("admin overview asset entry chain: quick link + readiness item", () => {
    renderAdmin("/admin");
    expect(screen.getByTestId("quick-link-assets")).toBeDefined();
    expect(screen.getByTestId("readiness-assets")).toBeDefined();
  });

  it("readiness-assets item shows M21 aktif not Desteklenmiyor", () => {
    renderAdmin("/admin");
    const item = screen.getByTestId("readiness-assets");
    expect(item.textContent).toContain("M21 aktif");
    expect(item.textContent).not.toContain("Desteklenmiyor");
  });

  it("readiness-assets item mentions operasyonlar", () => {
    renderAdmin("/admin");
    const item = screen.getByTestId("readiness-assets");
    expect(item.textContent).toContain("operasyonlari aktif");
  });

  it("admin overview deferred note does not mention asset library", () => {
    renderAdmin("/admin");
    const note = screen.getByTestId("release-readiness-deferred-note");
    expect(note.textContent).not.toContain("asset library");
  });
});
