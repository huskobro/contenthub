import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TemplateCreatePage } from "../pages/admin/TemplateCreatePage";
import { TemplatesRegistryPage } from "../pages/admin/TemplatesRegistryPage";
import type { TemplateResponse } from "../api/templatesApi";

const MOCK_TEMPLATE: TemplateResponse = {
  id: "tpl-1",
  name: "Test Template",
  template_type: "style",
  owner_scope: "admin",
  module_scope: "standard_video",
  description: "A test template",
  style_profile_json: '{"color":"#fff"}',
  content_rules_json: null,
  publish_profile_json: null,
  status: "draft",
  version: 1,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
};

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function renderCreatePage(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testRouter = createMemoryRouter(
    [
      { path: "/admin/templates/new", element: <TemplateCreatePage /> },
      { path: "/admin/templates", element: <TemplatesRegistryPage /> },
    ],
    { initialEntries: ["/admin/templates/new"] }
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

describe("TemplateForm / Create page smoke tests", () => {
  it("renders the create page heading", () => {
    renderCreatePage(mockFetch([]));
    expect(screen.getByTestId("tpl-create-heading")).toBeDefined();
  });

  it("shows the name field", () => {
    renderCreatePage(mockFetch([]));
    expect(screen.getByPlaceholderText("Template adı")).toBeDefined();
  });

  it("shows name validation error when name is empty", async () => {
    renderCreatePage(mockFetch([]));
    const user = userEvent.setup();
    const submitBtn = screen.getByRole("button", { name: "Oluştur" });
    await user.click(submitBtn);
    expect(screen.getByText("Ad zorunlu")).toBeDefined();
  });

  it("shows name validation error when name is only whitespace", async () => {
    renderCreatePage(mockFetch([]));
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Template adı"), "   ");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(screen.getByText("Ad zorunlu")).toBeDefined();
  });

  it("rejects negative version", async () => {
    renderCreatePage(mockFetch([]));
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Template adı"), "My Template");
    const versionInput = screen.getByDisplayValue("1");
    await user.clear(versionInput);
    await user.type(versionInput, "-5");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(screen.getByText("Version negatif olamaz")).toBeDefined();
  });

  it("rejects invalid JSON in style_profile_json", async () => {
    renderCreatePage(mockFetch([]));
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Template adı"), "My Template");
    const jsonTextareas = screen.getAllByPlaceholderText('{"key": "value"}');
    await user.type(jsonTextareas[0], "not valid json{{");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(screen.getByText("Geçersiz JSON")).toBeDefined();
  });

  it("calls create mutation on valid submit (fetch called with POST)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(MOCK_TEMPLATE),
    });
    window.fetch = fetchMock;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/templates/new", element: <TemplateCreatePage /> }],
      { initialEntries: ["/admin/templates/new"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Template adı"), "My Template");
    await user.click(screen.getByRole("button", { name: "Oluştur" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/templates"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("cancel button is present and clickable", async () => {
    renderCreatePage(mockFetch([]));
    const cancelBtn = screen.getByRole("button", { name: "İptal" });
    expect(cancelBtn).toBeDefined();
    // Just verify the button exists and is not disabled
    expect((cancelBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("registry page shows '+ Yeni Template' button", async () => {
    window.fetch = mockFetch([]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [
        { path: "/admin/templates", element: <TemplatesRegistryPage /> },
        { path: "/admin/templates/new", element: <TemplateCreatePage /> },
      ],
      { initialEntries: ["/admin/templates"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    expect(screen.getByRole("button", { name: "+ Yeni Sablon Olustur" })).toBeDefined();
  });

  it("edit mode opens when Düzenle is clicked in detail panel", async () => {
    let callCount = 0;
    window.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([MOCK_TEMPLATE]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_TEMPLATE) });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const testRouter = createMemoryRouter(
      [{ path: "/admin/templates", element: <TemplatesRegistryPage /> }],
      { initialEntries: ["/admin/templates"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Test Template")).toBeDefined());
    await user.click(screen.getByText("Test Template"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Düzenle" })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Düzenle" })).toBeDefined();
    });
  });
});
