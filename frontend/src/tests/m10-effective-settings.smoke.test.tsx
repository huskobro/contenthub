/**
 * M10 Effective Settings smoke tests.
 *
 * Tests for:
 *   - EffectiveSettingsPanel renders groups
 *   - WIRED/DEFERRED badges no longer render (registry kontrati: kayitsiz
 *     ayar yok — her ayar daimi wired)
 *   - Source badges display
 *   - Settings tab navigation includes "Effective Ayarlar"
 *   - Search/filter functionality
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsRegistryPage } from "../pages/admin/SettingsRegistryPage";
import type { EffectiveSetting, GroupSummary } from "../api/effectiveSettingsApi";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_GROUPS: GroupSummary[] = [
  { group: "credentials", label: "Kimlik Bilgileri", total: 6, wired: 6, secret: 6, missing: 2 },
  { group: "providers", label: "Provider Ayarlari", total: 9, wired: 9, secret: 0, missing: 0 },
  { group: "execution", label: "Calisma Ortami", total: 1, wired: 1, secret: 0, missing: 0 },
];

const MOCK_EFFECTIVE: EffectiveSetting[] = [
  {
    key: "credential.kie_ai_api_key",
    effective_value: "●●●●●●3456",
    source: "admin",
    type: "secret",
    is_secret: true,
    group: "credentials",
    label: "Kie.ai API Key",
    help_text: "Kie.ai uzerinden Gemini LLM erisimi icin API anahtari.",
    module_scope: null,
    wired: true,
    wired_to: "LLM provider (KieAiProvider) — startup + runtime reinit",
    builtin_default: null,
    env_var: "CONTENTHUB_KIE_AI_API_KEY",
    has_admin_override: true,
    has_db_row: true,
    db_version: 1,
    updated_at: "2026-04-05T00:00:00Z",
  },
  {
    key: "provider.llm.kie_model",
    effective_value: "gemini-2.5-flash",
    source: "builtin",
    type: "string",
    is_secret: false,
    group: "providers",
    label: "Kie.ai LLM Model",
    help_text: "Kie.ai uzerinden kullanilacak LLM model adi.",
    module_scope: null,
    wired: true,
    wired_to: "KieAiProvider model secimi — startup + runtime reinit",
    builtin_default: "gemini-2.5-flash",
    env_var: "",
    has_admin_override: false,
    has_db_row: true,
    db_version: 1,
    updated_at: null,
  },
  {
    key: "execution.render_still_timeout_seconds",
    effective_value: 120,
    source: "builtin",
    type: "integer",
    is_secret: false,
    group: "execution",
    label: "Render Still Timeout (saniye)",
    help_text: "Remotion still frame render isleminde maksimum bekleme suresi.",
    module_scope: "standard_video",
    wired: true,
    wired_to: "render_still executor timeout parametresi",
    builtin_default: 120,
    env_var: "",
    has_admin_override: false,
    has_db_row: true,
    db_version: 1,
    updated_at: null,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch() {
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => {
        if (typeof url === "string" && url.includes("/groups")) return Promise.resolve(MOCK_GROUPS);
        if (typeof url === "string" && url.includes("/effective")) return Promise.resolve(MOCK_EFFECTIVE);
        if (typeof url === "string" && url.includes("/credentials")) return Promise.resolve([]);
        return Promise.resolve([]);
      },
    }),
  ) as unknown as typeof window.fetch;
}

function renderPage() {
  window.fetch = mockFetch();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [{ path: "/admin/settings", element: <SettingsRegistryPage /> }],
    { initialEntries: ["/admin/settings"] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("M10 Effective Settings", () => {
  it("renders three tabs including Effective Ayarlar", () => {
    renderPage();
    expect(screen.getByTestId("settings-tab-credentials")).toBeDefined();
    expect(screen.getByTestId("settings-tab-effective")).toBeDefined();
    expect(screen.getByTestId("settings-tab-registry")).toBeDefined();
  });

  it("shows effective settings panel when tab is clicked", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      // Should show setting labels
      expect(screen.getByText("Kie.ai LLM Model")).toBeDefined();
    });
  });

  it("renders group sections", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("settings-group-credentials")).toBeDefined();
      expect(screen.getByTestId("settings-group-providers")).toBeDefined();
      expect(screen.getByTestId("settings-group-execution")).toBeDefined();
    });
  });

  it("does not render WIRED/DEFERRED badges (registry kontrati: kayitsiz ayar yok)", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("settings-group-credentials")).toBeDefined();
    });
    expect(screen.queryAllByTestId("badge-wired").length).toBe(0);
    expect(screen.queryAllByTestId("badge-deferred").length).toBe(0);
  });

  it("shows source badges", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("source-badge-admin")).toBeDefined();
      expect(screen.getAllByTestId("source-badge-builtin").length).toBe(2);
    });
  });

  it("masks secret values", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      const credRow = screen.getByTestId("setting-value-credential.kie_ai_api_key");
      expect(credRow.textContent).toContain("●●●●");
    });
  });

  it("shows non-secret effective values", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      const modelRow = screen.getByTestId("setting-value-provider.llm.kie_model");
      expect(modelRow.textContent).toBe("gemini-2.5-flash");
    });
  });

  it("shows wired_to description for wired settings", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByText(/KieAiProvider model secimi/)).toBeDefined();
    });
  });

  it("shows search input on effective tab", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("settings-search")).toBeDefined();
    });
  });

  it("filters settings by search term", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("settings-search")).toBeDefined();
    });

    const searchInput = screen.getByTestId("settings-search");
    await user.type(searchInput, "Render");

    await waitFor(() => {
      // Only execution setting should match
      expect(screen.getByText("Render Still Timeout (saniye)")).toBeDefined();
      expect(screen.queryByText("Kie.ai LLM Model")).toBeNull();
    });
  });

  it("shows group filter dropdown", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("settings-group-filter")).toBeDefined();
    });
  });

  it("does not show wired-only checkbox (filter kaldirildi)", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByTestId("settings-search")).toBeDefined();
    });
    expect(screen.queryByTestId("settings-wired-only")).toBeNull();
  });

  it("shows credential note for credential keys", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-effective"));

    await waitFor(() => {
      expect(screen.getByText(/Kimlik Bilgileri sekmesinden yonetilir/)).toBeDefined();
    });
  });
});
