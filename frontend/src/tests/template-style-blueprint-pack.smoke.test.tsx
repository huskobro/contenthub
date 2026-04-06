import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { TemplateCreatePage } from "../pages/admin/TemplateCreatePage";
import { TemplatesRegistryPage } from "../pages/admin/TemplatesRegistryPage";
import { StyleBlueprintCreatePage } from "../pages/admin/StyleBlueprintCreatePage";
import { StyleBlueprintsRegistryPage } from "../pages/admin/StyleBlueprintsRegistryPage";
import { TemplateStyleLinkCreatePage } from "../pages/admin/TemplateStyleLinkCreatePage";
import { TemplateStyleLinksRegistryPage } from "../pages/admin/TemplateStyleLinksRegistryPage";

/* ---- mock data ---- */

const MOCK_TEMPLATE = {
  id: "tpl-001",
  name: "Test Template",
  template_type: "content",
  owner_scope: "admin",
  module_scope: "standard_video",
  description: "A test template",
  style_profile_json: null,
  content_rules_json: null,
  publish_profile_json: null,
  status: "active",
  version: 1,
  style_link_count: 1,
  primary_link_role: "primary",
  created_at: "2026-04-03T10:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
};

const MOCK_BLUEPRINT = {
  id: "sb-001",
  name: "Test Blueprint",
  module_scope: "standard_video",
  status: "active",
  version: 1,
  visual_rules_json: null,
  motion_rules_json: null,
  layout_rules_json: null,
  subtitle_rules_json: null,
  thumbnail_rules_json: null,
  preview_strategy_json: null,
  notes: null,
  created_at: "2026-04-03T10:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
};

const MOCK_LINK = {
  id: "tsl-001",
  template_id: "tpl-001",
  style_blueprint_id: "sb-001",
  link_role: "primary",
  status: "active",
  notes: null,
  created_at: "2026-04-03T10:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
};

function mockFetch(handler: (url: string) => unknown) {
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(handler(url)),
    })
  ) as unknown as typeof window.fetch;
}

function renderAt(path: string, state?: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const entry = state ? { pathname: path, state } : path;
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "templates/new", element: <TemplateCreatePage /> },
          { path: "templates", element: <TemplatesRegistryPage /> },
          { path: "style-blueprints/new", element: <StyleBlueprintCreatePage /> },
          { path: "style-blueprints", element: <StyleBlueprintsRegistryPage /> },
          { path: "template-style-links/new", element: <TemplateStyleLinkCreatePage /> },
          { path: "template-style-links", element: <TemplateStyleLinksRegistryPage /> },
        ],
      },
    ],
    { initialEntries: [entry] }
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("Template/Style/Blueprint pack (Phase 282-286)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Phase 282: template system entry clarity", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("admin overview shows templates quick link with workflow desc", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-templates");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("Uretim hattinin yapi taslari");
    });

    it("templates registry shows heading with testid", () => {
      renderAt("/admin/templates");
      expect(screen.getByTestId("tpl-registry-heading")).toBeDefined();
      expect(screen.getByTestId("tpl-registry-heading").textContent).toContain("Sablon Kayitlari");
    });

    it("templates registry shows workflow note", () => {
      renderAt("/admin/templates");
      const note = screen.getByTestId("tpl-registry-workflow-note");
      expect(note.textContent).toContain("sablonlari");
      expect(note.textContent).toContain("gezin");
    });

    it("style blueprints registry shows heading with testid", () => {
      renderAt("/admin/style-blueprints");
      expect(screen.getByTestId("sb-registry-heading")).toBeDefined();
      expect(screen.getByTestId("sb-registry-heading").textContent).toContain("Style Blueprint Kayitlari");
    });

    it("style blueprints registry shows workflow note", () => {
      renderAt("/admin/style-blueprints");
      const note = screen.getByTestId("sb-registry-workflow-note");
      expect(note.textContent).toContain("Gorsel kimlik");
      expect(note.textContent).toContain("Blueprint secerek");
    });

    it("template-style links registry shows heading with testid", () => {
      renderAt("/admin/template-style-links");
      expect(screen.getByTestId("tsl-registry-heading")).toBeDefined();
      expect(screen.getByTestId("tsl-registry-heading").textContent).toContain("Sablon-Stil Baglantilari");
    });

    it("template-style links registry shows workflow note", () => {
      renderAt("/admin/template-style-links");
      const note = screen.getByTestId("tsl-registry-workflow-note");
      expect(note.textContent).toContain("baglantilari");
      expect(note.textContent).toContain("Birincil, yedek ve deneysel");
    });
  });

  describe("Phase 283: template create/edit workflow", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("template create page shows heading with testid", () => {
      renderAt("/admin/templates/new");
      expect(screen.getByTestId("tpl-create-heading")).toBeDefined();
      expect(screen.getByTestId("tpl-create-heading").textContent).toContain("Yeni Sablon");
    });

    it("template create page shows workflow subtitle", () => {
      renderAt("/admin/templates/new");
      const subtitle = screen.getByTestId("tpl-create-subtitle");
      expect(subtitle.textContent).toContain("sablonu olusturun");
      expect(subtitle.textContent).toContain("Blueprint");
      expect(subtitle.textContent).toContain("gorsel kurallar");
    });

    it("template create page has form with submit", () => {
      renderAt("/admin/templates/new");
      expect(screen.getByText("Oluştur")).toBeDefined();
    });

    it("template detail shows heading and workflow note", async () => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/templates") && url.includes("tpl-001")) return MOCK_TEMPLATE;
        return [MOCK_TEMPLATE];
      });
      renderAt("/admin/templates", { selectedId: "tpl-001" });
      expect(await screen.findByTestId("tpl-detail-heading")).toBeDefined();
      const note = await screen.findByTestId("tpl-detail-workflow-note");
      expect(note.textContent).toContain("uretim hattinda kullanilacak yapi tasi");
      expect(note.textContent).toContain("Style blueprint baglantilari");
    });
  });

  describe("Phase 284: style blueprint flow clarity", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("style blueprint create page shows heading with testid", () => {
      renderAt("/admin/style-blueprints/new");
      expect(screen.getByTestId("sb-create-heading")).toBeDefined();
      expect(screen.getByTestId("sb-create-heading").textContent).toContain("Yeni Style Blueprint");
    });

    it("style blueprint create page shows workflow subtitle", () => {
      renderAt("/admin/style-blueprints/new");
      const subtitle = screen.getByTestId("sb-create-subtitle");
      expect(subtitle.textContent).toContain("kurallarini tanimlayin");
      expect(subtitle.textContent).toContain("Gorsel kimlik");
      expect(subtitle.textContent).toContain("iliskilendirilir");
    });

    it("style blueprint create page has form with submit", () => {
      renderAt("/admin/style-blueprints/new");
      expect(screen.getByText("Oluştur")).toBeDefined();
    });

    it("style blueprint detail shows heading and workflow note", async () => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/style-blueprints") && url.includes("sb-001")) return MOCK_BLUEPRINT;
        return [MOCK_BLUEPRINT];
      });
      renderAt("/admin/style-blueprints", { selectedId: "sb-001" });
      expect(await screen.findByTestId("sb-detail-heading")).toBeDefined();
      const note = await screen.findByTestId("sb-detail-workflow-note");
      expect(note.textContent).toContain("gorsel ve yapisal kurallari");
      expect(note.textContent).toContain("Sablonlarla iliskilendirilerek");
    });
  });

  describe("Phase 285: template-style link visibility", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("template-style link create page shows heading with testid", () => {
      renderAt("/admin/template-style-links/new");
      expect(screen.getByTestId("tsl-create-heading")).toBeDefined();
      expect(screen.getByTestId("tsl-create-heading").textContent).toContain("Yeni Sablon-Stil Baglantisi");
    });

    it("template-style link create page shows workflow subtitle", () => {
      renderAt("/admin/template-style-links/new");
      const subtitle = screen.getByTestId("tsl-create-subtitle");
      expect(subtitle.textContent).toContain("baglantisi olusturun");
      expect(subtitle.textContent).toContain("Birincil, yedek veya deneysel");
    });

    it("template-style link create page has form with submit", () => {
      renderAt("/admin/template-style-links/new");
      expect(screen.getByText("Oluştur")).toBeDefined();
    });

    it("template-style link detail shows heading and workflow note", async () => {
      window.fetch = mockFetch((url) => {
        if (url.includes("/template-style-links") && url.includes("tsl-001")) return MOCK_LINK;
        return [MOCK_LINK];
      });
      renderAt("/admin/template-style-links", { selectedId: "tsl-001" });
      expect(await screen.findByTestId("tsl-detail-heading")).toBeDefined();
      const note = await screen.findByTestId("tsl-detail-workflow-note");
      expect(note.textContent).toContain("sablonun hangi style blueprint");
      expect(note.textContent).toContain("Rol ve durum bilgisi");
    });
  });

  describe("Phase 286: end-to-end verification", () => {
    beforeEach(() => {
      window.fetch = mockFetch(() => []);
    });

    it("admin overview templates quick link navigable", () => {
      renderAt("/admin");
      const card = screen.getByTestId("quick-link-templates");
      expect(card).toBeDefined();
    });

    it("templates registry button present", () => {
      renderAt("/admin/templates");
      expect(screen.getByRole("button", { name: "+ Yeni Sablon Olustur" })).toBeDefined();
    });

    it("style blueprints registry button present", () => {
      renderAt("/admin/style-blueprints");
      expect(screen.getByRole("button", { name: "+ Yeni Blueprint Olustur" })).toBeDefined();
    });

    it("template-style links registry button present", () => {
      renderAt("/admin/template-style-links");
      expect(screen.getByRole("button", { name: "+ Yeni Baglanti Olustur" })).toBeDefined();
    });
  });
});
