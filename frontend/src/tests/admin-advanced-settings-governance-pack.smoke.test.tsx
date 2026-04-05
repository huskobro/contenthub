import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "../app/layouts/AdminLayout";
import { SettingsRegistryPage } from "../pages/admin/SettingsRegistryPage";
import { VisibilityRegistryPage } from "../pages/admin/VisibilityRegistryPage";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_SETTINGS = [
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
    module_scope: "standard_video",
    help_text: "Uygulama adi",
    validation_rules_json: "{}",
    status: "active",
    version: 1,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];

const MOCK_RULES = [
  {
    id: "r1",
    rule_type: "field",
    target_key: "user.email",
    module_scope: null,
    role_scope: "admin",
    mode_scope: null,
    visible: true,
    read_only: false,
    wizard_visible: true,
    status: "active",
    priority: 10,
    notes: "Admin can see email",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mockFetch(handler: (url: string) => unknown) {
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(handler(url)),
    })
  ) as unknown as typeof window.fetch;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const testRouter = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "settings", element: <SettingsRegistryPage /> },
          { path: "visibility", element: <VisibilityRegistryPage /> },
        ],
      },
    ],
    { initialEntries: [path] }
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

/* ------------------------------------------------------------------ */
/*  Phase 305 — Settings Registry heading & workflow                   */
/* ------------------------------------------------------------------ */

describe("Phase 305 — Settings Registry heading and workflow note", () => {
  it("renders heading with testid settings-registry-heading", async () => {
    window.fetch = mockSettingsFetch();
    renderAt("/admin/settings");
    expect(screen.getByTestId("settings-registry-heading")).toBeDefined();
    expect(screen.getByTestId("settings-registry-heading").textContent).toBe("Ayarlar");
  });

  it("renders credentials tab by default", async () => {
    window.fetch = mockSettingsFetch();
    renderAt("/admin/settings");
    const tab = screen.getByTestId("settings-tab-credentials");
    expect(tab).toBeDefined();
    expect(tab.textContent).toBe("Kimlik Bilgileri ve Entegrasyonlar");
  });

  it("renders registry tab button", async () => {
    window.fetch = mockSettingsFetch();
    renderAt("/admin/settings");
    const tab = screen.getByTestId("settings-tab-registry");
    expect(tab).toBeDefined();
    expect(tab.textContent).toBe("Ayar Kayitlari");
  });

  it("renders subtitle with testid settings-registry-subtitle", async () => {
    window.fetch = mockSettingsFetch();
    renderAt("/admin/settings");
    const subtitle = screen.getByTestId("settings-registry-subtitle");
    expect(subtitle).toBeDefined();
    // Default tab is credentials — subtitle reflects credentials tab description
    expect(subtitle.textContent).toContain("API anahtarlari");
  });

  it("subtitle changes to governance text after switching to registry tab", async () => {
    window.fetch = mockSettingsFetch();
    renderAt("/admin/settings");
    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));
    const subtitle = screen.getByTestId("settings-registry-subtitle");
    expect(subtitle.textContent).toContain("DB tablosu");
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 306 — Setting Detail Panel governance sections               */
/* ------------------------------------------------------------------ */

/* Helper: settings mock that also serves empty array for credentials endpoint */
function mockSettingsFetch(settingDetailOverride?: unknown) {
  return mockFetch((url: string) => {
    if (url.includes("/credentials")) return [];
    if (settingDetailOverride && url.match(/\/settings\/[^/]+$/)) return settingDetailOverride;
    return MOCK_SETTINGS;
  });
}

describe("Phase 306 — Setting Detail Panel governance sections", () => {
  it("shows detail heading with testid when a setting is selected", async () => {
    window.fetch = mockSettingsFetch(MOCK_SETTINGS[0]);
    renderAt("/admin/settings");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      expect(screen.getByTestId("setting-detail-heading")).toBeDefined();
      expect(screen.getByTestId("setting-detail-heading").textContent).toBe("Ayar Detayi");
    });
  });

  it("shows detail note with testid", async () => {
    window.fetch = mockSettingsFetch(MOCK_SETTINGS[0]);
    renderAt("/admin/settings");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      expect(screen.getByTestId("setting-detail-note")).toBeDefined();
    });
  });

  it("shows identity section heading with testid", async () => {
    window.fetch = mockSettingsFetch(MOCK_SETTINGS[0]);
    renderAt("/admin/settings");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      expect(screen.getByTestId("setting-section-identity")).toBeDefined();
      expect(screen.getByTestId("setting-section-identity").textContent).toBe("Kimlik ve Deger");
    });
  });

  it("shows governance section heading with testid", async () => {
    window.fetch = mockSettingsFetch(MOCK_SETTINGS[0]);
    renderAt("/admin/settings");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      expect(screen.getByTestId("setting-section-governance")).toBeDefined();
      expect(screen.getByTestId("setting-section-governance").textContent).toBe("Governance");
    });
  });

  it("shows scope section heading with testid", async () => {
    window.fetch = mockSettingsFetch(MOCK_SETTINGS[0]);
    renderAt("/admin/settings");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      expect(screen.getByTestId("setting-section-scope")).toBeDefined();
      expect(screen.getByTestId("setting-section-scope").textContent).toBe("Kapsam ve Durum");
    });
  });

  it("shows Turkish governance labels (Kullanici Gorunur, Override Izni, Wizard Gorunur, Salt Okunur)", async () => {
    window.fetch = mockSettingsFetch(MOCK_SETTINGS[0]);
    renderAt("/admin/settings");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      expect(screen.getByText("Kullanici Gorunur")).toBeDefined();
      expect(screen.getByText("Override Izni")).toBeDefined();
      expect(screen.getByText("Wizard Gorunur")).toBeDefined();
      expect(screen.getByText("Salt Okunur")).toBeDefined();
    });
  });

  it("shows Turkish identity labels (Anahtar, Grup, Tur, Varsayilan Deger, Admin Degeri)", async () => {
    window.fetch = mockSettingsFetch(MOCK_SETTINGS[0]);
    renderAt("/admin/settings");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      expect(screen.getByText("Anahtar")).toBeDefined();
      expect(screen.getByText("Grup")).toBeDefined();
      expect(screen.getByText("Tur")).toBeDefined();
      expect(screen.getByText("Varsayilan Deger")).toBeDefined();
      expect(screen.getByText("Admin Degeri")).toBeDefined();
    });
  });

  it("renders BoolBadge values for governance fields", async () => {
    window.fetch = mockSettingsFetch(MOCK_SETTINGS[0]);
    renderAt("/admin/settings");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("settings-tab-registry"));

    await waitFor(() => {
      expect(screen.getByText("app.name")).toBeDefined();
    });

    await user.click(screen.getByText("app.name"));

    await waitFor(() => {
      // visible_to_user=true → "evet", user_override_allowed=false → "hayır"
      const evets = screen.getAllByText("evet");
      const hayirs = screen.getAllByText("hayır");
      expect(evets.length).toBeGreaterThanOrEqual(1);
      expect(hayirs.length).toBeGreaterThanOrEqual(1);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 307 — Visibility Registry heading & workflow                 */
/* ------------------------------------------------------------------ */

describe("Phase 307 — Visibility Registry heading and workflow note", () => {
  it("renders heading with testid visibility-registry-heading", async () => {
    window.fetch = mockFetch(() => MOCK_RULES);
    renderAt("/admin/visibility");
    expect(screen.getByTestId("visibility-registry-heading")).toBeDefined();
    expect(screen.getByTestId("visibility-registry-heading").textContent).toBe("Gorunurluk Kurallari");
  });

  it("renders subtitle with testid visibility-registry-subtitle", async () => {
    window.fetch = mockFetch(() => MOCK_RULES);
    renderAt("/admin/visibility");
    const subtitle = screen.getByTestId("visibility-registry-subtitle");
    expect(subtitle).toBeDefined();
    expect(subtitle.textContent).toContain("gorunurluk");
  });

  it("renders workflow note with testid visibility-registry-workflow-note", async () => {
    window.fetch = mockFetch(() => MOCK_RULES);
    renderAt("/admin/visibility");
    const note = screen.getByTestId("visibility-registry-workflow-note");
    expect(note).toBeDefined();
    expect(note.textContent).toContain("Kural Tanimlama");
    expect(note.textContent).toContain("Hedef Belirleme");
    expect(note.textContent).toContain("Wizard Durumu");
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 308 — Visibility Detail Panel governance sections            */
/* ------------------------------------------------------------------ */

describe("Phase 308 — Visibility Detail Panel governance sections", () => {
  it("shows detail heading with testid when a rule is selected", async () => {
    window.fetch = mockFetch((url) => {
      if (url.includes("/visibility-rules/")) return MOCK_RULES[0];
      return MOCK_RULES;
    });
    renderAt("/admin/visibility");

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      expect(screen.getByTestId("visibility-detail-heading")).toBeDefined();
      expect(screen.getByTestId("visibility-detail-heading").textContent).toBe("Kural Detayi");
    });
  });

  it("shows detail note with testid", async () => {
    window.fetch = mockFetch((url) => {
      if (url.includes("/visibility-rules/")) return MOCK_RULES[0];
      return MOCK_RULES;
    });
    renderAt("/admin/visibility");

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      expect(screen.getByTestId("visibility-detail-note")).toBeDefined();
    });
  });

  it("shows identity section heading with testid", async () => {
    window.fetch = mockFetch((url) => {
      if (url.includes("/visibility-rules/")) return MOCK_RULES[0];
      return MOCK_RULES;
    });
    renderAt("/admin/visibility");

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      expect(screen.getByTestId("visibility-section-identity")).toBeDefined();
      expect(screen.getByTestId("visibility-section-identity").textContent).toBe("Kimlik ve Hedef");
    });
  });

  it("shows scope section heading with testid", async () => {
    window.fetch = mockFetch((url) => {
      if (url.includes("/visibility-rules/")) return MOCK_RULES[0];
      return MOCK_RULES;
    });
    renderAt("/admin/visibility");

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      expect(screen.getByTestId("visibility-section-scope")).toBeDefined();
      expect(screen.getByTestId("visibility-section-scope").textContent).toBe("Kapsam");
    });
  });

  it("shows governance section heading with testid", async () => {
    window.fetch = mockFetch((url) => {
      if (url.includes("/visibility-rules/")) return MOCK_RULES[0];
      return MOCK_RULES;
    });
    renderAt("/admin/visibility");

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      expect(screen.getByTestId("visibility-section-governance")).toBeDefined();
      expect(screen.getByTestId("visibility-section-governance").textContent).toBe("Governance");
    });
  });

  it("shows status section heading with testid", async () => {
    window.fetch = mockFetch((url) => {
      if (url.includes("/visibility-rules/")) return MOCK_RULES[0];
      return MOCK_RULES;
    });
    renderAt("/admin/visibility");

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      expect(screen.getByTestId("visibility-section-status")).toBeDefined();
      expect(screen.getByTestId("visibility-section-status").textContent).toBe("Durum ve Notlar");
    });
  });

  it("shows Turkish labels for visibility governance fields", async () => {
    window.fetch = mockFetch((url) => {
      if (url.includes("/visibility-rules/")) return MOCK_RULES[0];
      return MOCK_RULES;
    });
    renderAt("/admin/visibility");

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      expect(screen.getByText("Kural Turu")).toBeDefined();
      expect(screen.getByText("Hedef Anahtar")).toBeDefined();
      expect(screen.getByText("Modul Kapsami")).toBeDefined();
      expect(screen.getByText("Rol Kapsami")).toBeDefined();
      expect(screen.getByText("Mod Kapsami")).toBeDefined();
      expect(screen.getByText("Gorunur")).toBeDefined();
      expect(screen.getByText("Salt Okunur")).toBeDefined();
      expect(screen.getByText("Wizard Gorunur")).toBeDefined();
      expect(screen.getByText("Oncelik")).toBeDefined();
      expect(screen.getByText("Notlar")).toBeDefined();
    });
  });

  it("renders BoolBadge values for visibility governance fields", async () => {
    window.fetch = mockFetch((url) => {
      if (url.includes("/visibility-rules/")) return MOCK_RULES[0];
      return MOCK_RULES;
    });
    renderAt("/admin/visibility");

    await waitFor(() => {
      expect(screen.getByText("user.email")).toBeDefined();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("user.email"));

    await waitFor(() => {
      // visible=true, read_only=false, wizard_visible=true
      const evets = screen.getAllByText("evet");
      const hayirs = screen.getAllByText("hayır");
      expect(evets.length).toBeGreaterThanOrEqual(2);
      expect(hayirs.length).toBeGreaterThanOrEqual(1);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Phase 309 — Admin Overview quick link updates                      */
/* ------------------------------------------------------------------ */

describe("Phase 309 — Admin Overview settings quick link governance desc", () => {
  it("settings quick link has governance-related description", async () => {
    window.fetch = mockFetch(() => []);
    renderAt("/admin");
    await waitFor(() => {
      const card = screen.getByTestId("quick-link-settings");
      expect(card).toBeDefined();
      expect(card.textContent).toContain("governance");
    });
  });
});
