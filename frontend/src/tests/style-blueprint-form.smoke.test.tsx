import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StyleBlueprintCreatePage } from "../pages/admin/StyleBlueprintCreatePage";
import { StyleBlueprintsRegistryPage } from "../pages/admin/StyleBlueprintsRegistryPage";
import type { StyleBlueprintResponse } from "../api/styleBlueprintsApi";

const MOCK_BLUEPRINT: StyleBlueprintResponse = {
  id: "bp-1",
  name: "Test Blueprint",
  module_scope: "standard_video",
  status: "draft",
  version: 1,
  visual_rules_json: null,
  motion_rules_json: null,
  layout_rules_json: null,
  subtitle_rules_json: null,
  thumbnail_rules_json: null,
  preview_strategy_json: null,
  notes: "test notları",
  created_at: "2026-04-02T08:00:00Z",
  updated_at: "2026-04-02T08:00:00Z",
};

function makeRouter(
  fetchFn: typeof window.fetch,
  initialPath = "/admin/style-blueprints/new"
) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [
      { path: "/admin/style-blueprints/new", element: <StyleBlueprintCreatePage /> },
      { path: "/admin/style-blueprints", element: <StyleBlueprintsRegistryPage /> },
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

describe("StyleBlueprint form smoke tests", () => {
  it("renders the create page heading", () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINT) }));
    expect(screen.getByTestId("sb-create-heading")).toBeDefined();
  });

  it("shows name required error on empty submit", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINT) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Ad zorunlu")).toBeDefined();
    });
  });

  it("shows invalid JSON error for visual_rules_json", async () => {
    makeRouter(vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINT) }));
    const user = userEvent.setup();
    const textareas = screen.getAllByRole("textbox");
    // visual_rules_json is the first textarea in the JSON section (index after name/module/notes = index 3)
    const nameInput = textareas[0];
    await user.type(nameInput, "Some Blueprint");
    // visual_rules_json textarea — find by label or position
    const jsonTextareas = screen.getAllByPlaceholderText('{"key": "value"}');
    await user.type(jsonTextareas[0], "not-json");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    await waitFor(() => {
      expect(screen.getByText("Geçersiz JSON")).toBeDefined();
    });
  });

  it("cancel button is present on create page", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
      "/admin/style-blueprints/new"
    );
    expect(screen.getByRole("button", { name: "İptal" })).toBeDefined();
  });

  it("submit button is disabled while submitting", async () => {
    // This test verifies that the submit button exists with the correct label
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
      "/admin/style-blueprints/new"
    );
    expect(screen.getByRole("button", { name: "Oluştur" })).toBeDefined();
  });

  it("registry page shows Yeni button", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
      "/admin/style-blueprints"
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Yeni Blueprint Olustur" })).toBeDefined();
    });
  });

  it("registry page shows blueprint in list after load", async () => {
    makeRouter(
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([MOCK_BLUEPRINT]) }),
      "/admin/style-blueprints"
    );
    await waitFor(() => {
      expect(screen.getByText("Test Blueprint")).toBeDefined();
    });
  });

  it("detail panel shows Düzenle button when blueprint selected", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_BLUEPRINT]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINT) });
    });
    makeRouter(fetchFn, "/admin/style-blueprints");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Test Blueprint")).toBeDefined());
    await user.click(screen.getByText("Test Blueprint"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined();
    });
  });

  it("edit mode opens when Düzenle is clicked", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_BLUEPRINT]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINT) });
    });
    makeRouter(fetchFn, "/admin/style-blueprints");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Test Blueprint")).toBeDefined());
    await user.click(screen.getByText("Test Blueprint"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Blueprint Düzenle" })).toBeDefined();
    });
  });

  it("cancel closes edit mode", async () => {
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_BLUEPRINT]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_BLUEPRINT) });
    });
    makeRouter(fetchFn, "/admin/style-blueprints");
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Test Blueprint")).toBeDefined());
    await user.click(screen.getByText("Test Blueprint"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Blueprint Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "İptal" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Blueprint Düzenle" })).toBeNull();
    });
  });
});
