import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TemplateStyleLinkCreatePage } from "../pages/admin/TemplateStyleLinkCreatePage";
import { TemplateStyleLinksRegistryPage } from "../pages/admin/TemplateStyleLinksRegistryPage";
import type { TemplateStyleLinkResponse } from "../api/templateStyleLinksApi";

const MOCK_LINK: TemplateStyleLinkResponse = {
  id: "link-1",
  template_id: "tmpl-abc-123",
  style_blueprint_id: "bp-xyz-456",
  link_role: "primary",
  status: "active",
  notes: "Ana bağlantı",
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
};

function makeRouter(
  fetchFn: typeof window.fetch,
  initialPath = "/admin/template-style-links/new"
) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [
      { path: "/admin/template-style-links/new", element: <TemplateStyleLinkCreatePage /> },
      { path: "/admin/template-style-links", element: <TemplateStyleLinksRegistryPage /> },
    ],
    { initialEntries: [initialPath] }
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TemplateStyleLink form smoke tests", () => {
  it("renders the create page heading", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) }));
    expect(screen.getByTestId("tsl-create-heading")).toBeDefined();
  });

  it("shows template_id required error on empty submit", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Template ID zorunlu")).toBeDefined();
    });
  });

  it("shows blueprint_id required error on empty submit", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Blueprint ID zorunlu")).toBeDefined();
    });
  });

  it("cancel button is present on create page", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) }));
    expect(screen.getByRole("button", { name: "İptal" })).toBeDefined();
  });

  it("submit button is present on create page", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) }));
    expect(screen.getByRole("button", { name: "Oluştur" })).toBeDefined();
  });

  it("registry page shows Yeni button", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
      "/admin/template-style-links"
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Yeni Baglanti Olustur" })).toBeDefined();
    });
  });

  it("registry page shows link in list after load", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([MOCK_LINK]) }),
      "/admin/template-style-links"
    );
    await waitFor(() => {
      expect(screen.getByText("primary")).toBeDefined();
    });
  });

  it("detail panel shows Düzenle button when link selected", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_LINK]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) });
    });
    makeRouter(fetchFn, "/admin/template-style-links");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("primary")).toBeDefined());
    await user.click(screen.getByText("primary"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("edit mode opens when Düzenle is clicked", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_LINK]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) });
    });
    makeRouter(fetchFn, "/admin/template-style-links");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("primary")).toBeDefined());
    await user.click(screen.getByText("primary"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Link Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes edit mode", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_LINK]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_LINK) });
    });
    makeRouter(fetchFn, "/admin/template-style-links");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("primary")).toBeDefined());
    await user.click(screen.getByText("primary"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Link Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Link Düzenle" })).toBeNull();
    });
  });
});
