import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { SettingsRegistryPage } from "../pages/admin/SettingsRegistryPage";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import type { SettingResponse } from "../api/settingsApi";

const MOCK_SETTINGS: SettingResponse[] = [
  {
    id: "s1",
    key: "app.name",
    group_name: "general",
    type: "string",
    default_value_json: '"ContentHub"',
    admin_value_json: '"ContentHub"',
    user_override_allowed: false,
    visible_to_user: true,
    visible_in_wizard: false,
    read_only_for_user: true,
    module_scope: null,
    help_text: "Uygulama adı",
    validation_rules_json: "{}",
    status: "active",
    version: 1,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "s2",
    key: "video.quality",
    group_name: "video",
    type: "string",
    default_value_json: '"1080p"',
    admin_value_json: '"1080p"',
    user_override_allowed: true,
    visible_to_user: true,
    visible_in_wizard: true,
    read_only_for_user: false,
    module_scope: "standard_video",
    help_text: null,
    validation_rules_json: "{}",
    status: "active",
    version: 2,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

/* Smarter mock: returns [] for credentials/effective/groups endpoints, data for settings */
function mockFetchUrl(data: unknown, status = 200) {
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => {
        if (typeof url === "string" && url.includes("/credentials")) return Promise.resolve([]);
        if (typeof url === "string" && url.includes("/groups")) return Promise.resolve([]);
        if (typeof url === "string" && url.includes("/effective")) return Promise.resolve([]);
        return Promise.resolve(data);
      },
    })
  ) as unknown as typeof window.fetch;
}

function renderSettings(fetchFn: typeof window.fetch) {
  window.fetch = fetchFn;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const testRouter = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "settings", element: <SettingsRegistryPage /> },
        ],
      },
    ],
    { initialEntries: ["/admin/settings"] }
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

describe("Settings Registry smoke tests", () => {
  it("renders the settings page at /admin/settings", async () => {
    renderSettings(mockFetchUrl(MOCK_SETTINGS));
    expect(screen.getByRole("heading", { name: "Ayarlar" })).toBeDefined();
  });

  it("shows loading state on registry tab", async () => {
    // fetch that never resolves
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const testRouter = createMemoryRouter(
      [
        {
          path: "/admin/settings",
          element: <SettingsRegistryPage />,
        },
      ],
      { initialEntries: ["/admin/settings"] }
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={testRouter} />
      </QueryClientProvider>
    );
    // Switch to the registry tab to trigger loading indicator
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));
    expect(screen.getByText("Yukleniyor...")).toBeDefined();
  });

  it("displays settings list after switching to registry tab and data loads", async () => {
    renderSettings(mockFetchUrl(MOCK_SETTINGS));
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));
    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
      expect(screen.getByText("video.quality")).toBeDefined();
    });
  });

  it("shows detail panel placeholder when no setting selected (registry tab)", async () => {
    renderSettings(mockFetchUrl(MOCK_SETTINGS));
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));
    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });
    expect(screen.getByText("Detay görmek için bir ayar seçin.")).toBeDefined();
  });

  it("shows detail panel when a setting is selected (registry tab)", async () => {
    const detailFetch = vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => {
          if (url.includes("/credentials")) return Promise.resolve([]);
          if (url.match(/\/settings\/[^/]+$/)) return Promise.resolve(MOCK_SETTINGS[0]);
          return Promise.resolve(MOCK_SETTINGS);
        },
      })
    ) as unknown as typeof window.fetch;

    renderSettings(detailFetch);

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      expect(screen.getByText("Ayar Detayi")).toBeDefined();
      expect(screen.getByText("Uygulama adı")).toBeDefined();
    });
  });
});
