import { render, screen, fireEvent } from "@testing-library/react";
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

  it("admin overview release readiness includes Varlik Kutuphanesi", () => {
    renderAdmin("/admin");
    const item = screen.getByTestId("readiness-assets");
    expect(item).toBeDefined();
    expect(item.textContent).toContain("Omurga hazir");
    expect(item.textContent).toContain("Varlik Kutuphanesi");
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Registry / List / Gallery Surface                            */
/* ------------------------------------------------------------------ */

describe("Asset Registry / List / Gallery Surface", () => {
  it("asset library heading is correct", () => {
    renderAssets();
    const h = screen.getByTestId("asset-library-heading");
    expect(h.textContent).toBe("Varlik Kutuphanesi");
  });

  it("asset library has subtitle", () => {
    renderAssets();
    const sub = screen.getByTestId("asset-library-subtitle");
    expect(sub.textContent).toContain("media ve tasarim varliklari");
  });

  it("asset library has workflow note", () => {
    renderAssets();
    const note = screen.getByTestId("asset-library-workflow-note");
    expect(note.textContent).toContain("Varlik akis zinciri");
    expect(note.textContent).toContain("Tekrar Kullanim");
  });

  it("asset registry list section is present", () => {
    renderAssets();
    expect(screen.getByTestId("asset-registry-list")).toBeDefined();
    expect(screen.getByTestId("asset-registry-heading").textContent).toBe("Varlik Kayitlari");
  });

  it("asset table is rendered with placeholder data", () => {
    renderAssets();
    expect(screen.getByTestId("asset-table")).toBeDefined();
  });

  it("shows placeholder asset rows", () => {
    renderAssets();
    expect(screen.getByTestId("asset-row-asset-001")).toBeDefined();
    expect(screen.getByTestId("asset-row-asset-002")).toBeDefined();
    expect(screen.getByTestId("asset-row-asset-003")).toBeDefined();
  });

  it("asset detail panel empty state shown when no selection", () => {
    renderAssets();
    expect(screen.getByTestId("asset-detail-panel-empty")).toBeDefined();
    expect(screen.getByTestId("asset-detail-panel-empty-note")).toBeDefined();
  });

  it("clicking a row shows detail panel", () => {
    renderAssets();
    const row = screen.getByTestId("asset-row-asset-001");
    fireEvent.click(row);
    expect(screen.getByTestId("asset-detail-panel")).toBeDefined();
    expect(screen.getByTestId("asset-detail-heading").textContent).toBe("Varlik Detayi");
  });

  it("detail panel shows asset name after selection", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    const name = screen.getByTestId("asset-detail-name");
    expect(name.textContent).toContain("Intro Muzigi");
  });

  it("detail panel shows asset type after selection", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    const type = screen.getByTestId("asset-detail-type");
    expect(type.textContent).toContain("Muzik");
  });

  it("detail panel shows asset source path after selection", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    const source = screen.getByTestId("asset-detail-source");
    expect(source.textContent).toContain("workspace/assets");
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Type Grouping Clarity                                        */
/* ------------------------------------------------------------------ */

describe("Asset Type Grouping Clarity", () => {
  it("asset type groups section is present", () => {
    renderAssets();
    expect(screen.getByTestId("asset-type-groups")).toBeDefined();
    expect(screen.getByTestId("asset-type-groups-heading").textContent).toBe("Varlik Turleri");
  });

  it("type groups note is present", () => {
    renderAssets();
    const note = screen.getByTestId("asset-type-groups-note");
    expect(note.textContent).toContain("gruplara ayrilmistir");
  });

  it("type group list is rendered", () => {
    renderAssets();
    expect(screen.getByTestId("asset-type-group-list")).toBeDefined();
  });

  it("ses ve muzik group is visible", () => {
    renderAssets();
    const group = screen.getByTestId("asset-type-group-ses-ve-muzik");
    expect(group.textContent).toContain("Ses ve Muzik");
    expect(group.textContent).toContain("Muzik / Ses");
  });

  it("gorsel varliklar group is visible", () => {
    renderAssets();
    const group = screen.getByTestId("asset-type-group-gorsel-varliklar");
    expect(group.textContent).toContain("Gorsel Varliklar");
  });

  it("video ve hareket group is visible", () => {
    renderAssets();
    const group = screen.getByTestId("asset-type-group-video-ve-hareket");
    expect(group.textContent).toContain("Video ve Hareket");
  });

  it("tipografi ve altyazi group is visible", () => {
    renderAssets();
    const group = screen.getByTestId("asset-type-group-tipografi-ve-altyazi");
    expect(group.textContent).toContain("Tipografi ve Altyazi");
  });

  it("marka varliklari group is visible", () => {
    renderAssets();
    const group = screen.getByTestId("asset-type-group-marka-varliklari");
    expect(group.textContent).toContain("Marka Varliklari");
  });

  it("each row has a type badge", () => {
    renderAssets();
    expect(screen.getByTestId("asset-type-badge-asset-001")).toBeDefined();
    expect(screen.getByTestId("asset-type-badge-asset-002")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Filter / Sort / Search Clarity                                     */
/* ------------------------------------------------------------------ */

describe("Filter / Sort / Search Clarity", () => {
  it("filter area is present", () => {
    renderAssets();
    expect(screen.getByTestId("asset-filter-area")).toBeDefined();
    expect(screen.getByTestId("asset-filter-heading").textContent).toBe("Filtre ve Arama");
  });

  it("search input is present and functional", () => {
    renderAssets();
    const input = screen.getByTestId("asset-search-input") as HTMLInputElement;
    expect(input).toBeDefined();
    fireEvent.change(input, { target: { value: "Intro" } });
    expect(input.value).toBe("Intro");
  });

  it("type filter select is present", () => {
    renderAssets();
    const select = screen.getByTestId("asset-type-filter") as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.value).toBe("tumu");
  });

  it("sort select is present (disabled)", () => {
    renderAssets();
    const sort = screen.getByTestId("asset-sort-select") as HTMLSelectElement;
    expect(sort.disabled).toBe(true);
  });

  it("filter note mentions backend entegrasyonu for sort", () => {
    renderAssets();
    const note = screen.getByTestId("asset-filter-note");
    expect(note.textContent).toContain("backend entegrasyonu");
  });

  it("search filter narrows results", () => {
    renderAssets();
    const input = screen.getByTestId("asset-search-input");
    fireEvent.change(input, { target: { value: "Intro Muzigi" } });
    expect(screen.getByTestId("asset-row-asset-001")).toBeDefined();
    expect(screen.queryByTestId("asset-row-asset-002")).toBeNull();
  });

  it("type filter narrows results to selected type", () => {
    renderAssets();
    const select = screen.getByTestId("asset-type-filter");
    fireEvent.change(select, { target: { value: "font" } });
    expect(screen.getByTestId("asset-row-asset-002")).toBeDefined();
    expect(screen.queryByTestId("asset-row-asset-001")).toBeNull();
  });

  it("no match shows empty state", () => {
    renderAssets();
    const input = screen.getByTestId("asset-search-input");
    fireEvent.change(input, { target: { value: "XYZ_DOES_NOT_EXIST_12345" } });
    expect(screen.getByTestId("asset-empty-state")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Detail View                                                  */
/* ------------------------------------------------------------------ */

describe("Asset Detail View", () => {
  it("detail panel shows all required fields", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    expect(screen.getByTestId("asset-detail-name")).toBeDefined();
    expect(screen.getByTestId("asset-detail-type")).toBeDefined();
    expect(screen.getByTestId("asset-detail-status")).toBeDefined();
    expect(screen.getByTestId("asset-detail-source")).toBeDefined();
    expect(screen.getByTestId("asset-detail-notes")).toBeDefined();
  });

  it("detail panel shows reuse context", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    expect(screen.getByTestId("asset-reuse-context")).toBeDefined();
    expect(screen.getByTestId("asset-reuse-heading").textContent).toBe("Kullanim Baglami");
  });

  it("detail notes describe content correctly", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    const notes = screen.getByTestId("asset-detail-notes");
    expect(notes.textContent).toContain("Standart video intro");
  });

  it("clicking same row again deselects", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    expect(screen.getByTestId("asset-detail-panel")).toBeDefined();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    expect(screen.getByTestId("asset-detail-panel-empty")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Reuse / Pick / Attach Flow                                   */
/* ------------------------------------------------------------------ */

describe("Asset Reuse / Pick / Attach Flow", () => {
  it("reuse context section is shown in detail panel", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    expect(screen.getByTestId("asset-reuse-context")).toBeDefined();
  });

  it("reuse note mentions production surfaces", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    const note = screen.getByTestId("asset-reuse-note");
    expect(note.textContent).toContain("sablon");
    expect(note.textContent).toContain("style blueprint");
    expect(note.textContent).toContain("thumbnail");
  });

  it("attach deferred note uses backend entegrasyonu wording", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    const note = screen.getByTestId("asset-attach-deferred-note");
    expect(note.textContent).toContain("backend entegrasyonu");
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Preview / Reference Safety                                   */
/* ------------------------------------------------------------------ */

describe("Asset Preview / Reference Safety", () => {
  it("preview badge shown for preview-tagged assets", () => {
    renderAssets();
    expect(screen.getByTestId("asset-preview-badge-asset-004")).toBeDefined();
    expect(screen.getByTestId("asset-preview-badge-asset-005")).toBeDefined();
    expect(screen.getByTestId("asset-preview-badge-asset-006")).toBeDefined();
  });

  it("non-preview assets do not have preview badge", () => {
    renderAssets();
    expect(screen.queryByTestId("asset-preview-badge-asset-001")).toBeNull();
    expect(screen.queryByTestId("asset-preview-badge-asset-002")).toBeNull();
  });

  it("preview safety note shown in detail panel for preview asset", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-004"));
    const note = screen.getByTestId("asset-preview-safety-note");
    expect(note.textContent).toContain("onizleme veya referans");
    expect(note.textContent).toContain("Final");
    expect(note.textContent).toContain("render ciktisi");
  });

  it("preview safety note NOT shown for non-preview asset", () => {
    renderAssets();
    fireEvent.click(screen.getByTestId("asset-row-asset-001"));
    expect(screen.queryByTestId("asset-preview-safety-note")).toBeNull();
  });

  it("global preview reference safety note is present", () => {
    renderAssets();
    const note = screen.getByTestId("asset-preview-reference-safety");
    expect(note.textContent).toContain("Onizleme / Referans Guvenlik Notu");
    expect(note.textContent).toContain("garantili final render cikti degildir");
  });

  it("asset library deferred note is present", () => {
    renderAssets();
    const note = screen.getByTestId("asset-library-deferred-note");
    expect(note.textContent).toContain("backend entegrasyonu");
    expect(note.textContent).toContain("Gercek media ingestion");
  });
});

/* ------------------------------------------------------------------ */
/*  Asset Library Verification — End-to-End                           */
/* ------------------------------------------------------------------ */

describe("Asset Library Verification — End-to-End", () => {
  it("full chain: heading + subtitle + workflow + type groups + filter + list", () => {
    renderAssets();
    expect(screen.getByTestId("asset-library-heading")).toBeDefined();
    expect(screen.getByTestId("asset-library-subtitle")).toBeDefined();
    expect(screen.getByTestId("asset-library-workflow-note")).toBeDefined();
    expect(screen.getByTestId("asset-type-groups")).toBeDefined();
    expect(screen.getByTestId("asset-filter-area")).toBeDefined();
    expect(screen.getByTestId("asset-registry-list")).toBeDefined();
  });

  it("admin overview asset entry chain: quick link → readiness item", () => {
    renderAdmin("/admin");
    expect(screen.getByTestId("quick-link-assets")).toBeDefined();
    expect(screen.getByTestId("readiness-assets")).toBeDefined();
  });

  it("admin overview deferred note no longer mentions asset library", () => {
    renderAdmin("/admin");
    const note = screen.getByTestId("release-readiness-deferred-note");
    expect(note.textContent).not.toContain("asset library");
  });

  it("type filter + search filter work together without breaking", () => {
    renderAssets();
    const select = screen.getByTestId("asset-type-filter");
    fireEvent.change(select, { target: { value: "tumu" } });
    const input = screen.getByTestId("asset-search-input");
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByTestId("asset-table")).toBeDefined();
  });

  it("preview safety language consistent: onizleme vs final output clearly separated", () => {
    renderAssets();
    const globalNote = screen.getByTestId("asset-preview-reference-safety");
    expect(globalNote.textContent).toContain("garantili final render cikti degildir");
    expect(globalNote.textContent).toContain("final uretim sonuclarindan ayri");
  });
});
