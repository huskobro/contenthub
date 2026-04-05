import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { AssetLibraryPage } from "../pages/admin/AssetLibraryPage";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderAdmin(path: string) {
  window.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })
  ) as unknown as typeof window.fetch;

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

function renderAssets() {
  return renderAdmin("/admin/assets");
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

  it("admin overview release readiness includes Varlik Kutuphanesi with Desteklenmiyor status", () => {
    renderAdmin("/admin");
    const item = screen.getByTestId("readiness-assets");
    expect(item).toBeDefined();
    expect(item.textContent).toContain("Desteklenmiyor");
    expect(item.textContent).toContain("Varlik Kutuphanesi");
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Library Empty State                                          */
/* ------------------------------------------------------------------ */

describe("Asset Library Empty State", () => {
  it("asset library heading is correct", () => {
    renderAssets();
    const h = screen.getByTestId("asset-library-heading");
    expect(h.textContent).toBe("Varlik Kutuphanesi");
  });

  it("asset library has subtitle mentioning media ve tasarim varliklari", () => {
    renderAssets();
    const sub = screen.getByTestId("asset-library-subtitle");
    expect(sub.textContent).toContain("media ve tasarim varliklari");
  });

  it("asset library shows empty state with testid", () => {
    renderAssets();
    const emptyState = screen.getByTestId("asset-library-empty-state");
    expect(emptyState).toBeDefined();
  });

  it("asset library empty state text says henuz aktif degil", () => {
    renderAssets();
    const emptyState = screen.getByTestId("asset-library-empty-state");
    expect(emptyState.textContent).toContain("Varlik Kutuphanesi henuz aktif degil");
  });

  it("asset library empty state mentions backend altyapisi", () => {
    renderAssets();
    const emptyState = screen.getByTestId("asset-library-empty-state");
    expect(emptyState.textContent).toContain("backend");
  });

  it("asset library empty state mentions unsupported", () => {
    renderAssets();
    const emptyState = screen.getByTestId("asset-library-empty-state");
    expect(emptyState.textContent).toContain("desteklenmiyor");
  });

  it("asset library does not render asset table", () => {
    renderAssets();
    expect(screen.queryByTestId("asset-table")).toBeNull();
  });

  it("asset library does not render placeholder rows", () => {
    renderAssets();
    expect(screen.queryByTestId("asset-row-asset-001")).toBeNull();
    expect(screen.queryByTestId("asset-row-asset-002")).toBeNull();
  });

  it("asset library does not render filter area", () => {
    renderAssets();
    expect(screen.queryByTestId("asset-filter-area")).toBeNull();
  });

  it("asset library does not render type groups section", () => {
    renderAssets();
    expect(screen.queryByTestId("asset-type-groups")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Library — Admin Overview Verification                        */
/* ------------------------------------------------------------------ */

describe("Asset Library Verification — Admin Overview", () => {
  it("admin overview asset entry chain: quick link → readiness item", () => {
    renderAdmin("/admin");
    expect(screen.getByTestId("quick-link-assets")).toBeDefined();
    expect(screen.getByTestId("readiness-assets")).toBeDefined();
  });

  it("readiness-assets item shows Desteklenmiyor not Omurga hazir", () => {
    renderAdmin("/admin");
    const item = screen.getByTestId("readiness-assets");
    expect(item.textContent).toContain("Desteklenmiyor");
    expect(item.textContent).not.toContain("Omurga hazir");
  });

  it("readiness-assets item mentions backend asset altyapisi mevcut degil", () => {
    renderAdmin("/admin");
    const item = screen.getByTestId("readiness-assets");
    expect(item.textContent).toContain("Backend asset altyapisi mevcut degil");
  });

  it("admin overview deferred note does not mention asset library", () => {
    renderAdmin("/admin");
    const note = screen.getByTestId("release-readiness-deferred-note");
    expect(note.textContent).not.toContain("asset library");
  });
});
