/**
 * DynamicAdminLayout / DynamicUserLayout smoke tests — Faz 1.
 *
 * These tests verify the end-to-end behavior from:
 *   themeStore.activeSurfaceId + settings snapshot →
 *   useSurfaceResolution →
 *   DynamicAdminLayout/DynamicUserLayout →
 *   rendered surface shell.
 *
 * We stub the effective-settings fetcher via vi.mock BEFORE importing the
 * components so the hook reads our controlled snapshot.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock the effective settings API module. Each test can override the
// returned value via `settingsMock.next(snapshot)`.
const settingsMock = vi.hoisted(() => {
  let state: Record<string, unknown> = {
    "ui.surface.infrastructure.enabled": false,
    "ui.surface.default.admin": "legacy",
    "ui.surface.default.user": "legacy",
    "ui.surface.atrium.enabled": false,
    "ui.surface.bridge.enabled": false,
    "ui.surface.canvas.enabled": false,
    "ui.active_theme": "obsidian-slate",
  };
  return {
    next(v: Record<string, unknown>) {
      state = { ...state, ...v };
    },
    fetchEffectiveSetting: async (key: string) => ({
      key,
      effective_value: state[key] ?? null,
      source: "default" as const,
      type: typeof state[key] === "boolean" ? "boolean" : "string",
      is_secret: false,
      group: "ui",
      label: key,
      help_text: "",
      module_scope: null,
      wired: true,
      wired_to: "",
      builtin_default: null,
      env_var: "",
      has_admin_override: false,
      has_db_row: false,
      db_version: null,
      updated_at: null,
    }),
    updateSettingAdminValue: async (_key: string, _value: unknown) => {
      // no-op
    },
    fetchEffectiveSettings: async () => [],
    fetchGroups: async () => [],
  };
});

vi.mock("../api/effectiveSettingsApi", () => ({
  fetchEffectiveSetting: settingsMock.fetchEffectiveSetting,
  updateSettingAdminValue: settingsMock.updateSettingAdminValue,
  fetchEffectiveSettings: settingsMock.fetchEffectiveSettings,
  fetchGroups: settingsMock.fetchGroups,
}));

// Mock the real layout shells so we can assert which one was rendered.
vi.mock("../app/layouts/AdminLayout", () => ({
  AdminLayout: () => <div data-testid="admin-layout-classic">ADMIN-CLASSIC</div>,
}));
vi.mock("../app/layouts/HorizonAdminLayout", () => ({
  HorizonAdminLayout: () => <div data-testid="admin-layout-horizon">ADMIN-HORIZON</div>,
}));
vi.mock("../app/layouts/UserLayout", () => ({
  UserLayout: () => <div data-testid="user-layout-classic">USER-CLASSIC</div>,
}));
vi.mock("../app/layouts/HorizonUserLayout", () => ({
  HorizonUserLayout: () => <div data-testid="user-layout-horizon">USER-HORIZON</div>,
}));

async function freshImport() {
  vi.resetModules();
  // Re-apply mocks after resetModules.
  vi.doMock("../api/effectiveSettingsApi", () => ({
    fetchEffectiveSetting: settingsMock.fetchEffectiveSetting,
    updateSettingAdminValue: settingsMock.updateSettingAdminValue,
    fetchEffectiveSettings: settingsMock.fetchEffectiveSettings,
    fetchGroups: settingsMock.fetchGroups,
  }));
  vi.doMock("../app/layouts/AdminLayout", () => ({
    AdminLayout: () => <div data-testid="admin-layout-classic">ADMIN-CLASSIC</div>,
  }));
  vi.doMock("../app/layouts/HorizonAdminLayout", () => ({
    HorizonAdminLayout: () => <div data-testid="admin-layout-horizon">ADMIN-HORIZON</div>,
  }));
  vi.doMock("../app/layouts/UserLayout", () => ({
    UserLayout: () => <div data-testid="user-layout-classic">USER-CLASSIC</div>,
  }));
  vi.doMock("../app/layouts/HorizonUserLayout", () => ({
    HorizonUserLayout: () => <div data-testid="user-layout-horizon">USER-HORIZON</div>,
  }));
  // Trigger surface registration first.
  await import("../surfaces");
  const admin = await import("../app/layouts/DynamicAdminLayout");
  const user = await import("../app/layouts/DynamicUserLayout");
  const resolver = await import("../surfaces/useSurfaceResolution");
  const store = await import("../stores/themeStore");
  return { admin, user, resolver, store };
}

describe("Dynamic layouts — Faz 1 surface resolution", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders classic admin layout by default (kill switch OFF, classic theme)", async () => {
    settingsMock.next({ "ui.surface.infrastructure.enabled": false });
    const { admin } = await freshImport();
    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<admin.DynamicAdminLayout />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("admin-layout-classic")).toBeDefined();
    });
  });

  it("renders classic user layout by default", async () => {
    settingsMock.next({ "ui.surface.infrastructure.enabled": false });
    const { user } = await freshImport();
    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<user.DynamicUserLayout />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("user-layout-classic")).toBeDefined();
    });
  });

  it("falls back to legacy when user picks a disabled surface (atrium)", async () => {
    settingsMock.next({
      "ui.surface.infrastructure.enabled": true,
      "ui.surface.atrium.enabled": true, // settings allow it...
    });
    const { admin, resolver, store } = await freshImport();
    // ...but the atrium manifest in the registry is disabled, so resolver
    // must fall back to legacy.
    store.useThemeStore.getState().setActiveSurface("atrium");
    // Ensure snapshot is loaded (seeded by hook) — drive a direct override:
    resolver.__setSurfaceSettingsSnapshot({
      infrastructureEnabled: true,
      defaultAdmin: "legacy",
      defaultUser: "legacy",
      atriumEnabled: true,
      bridgeEnabled: false,
      canvasEnabled: false,
      loaded: true,
    });
    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<admin.DynamicAdminLayout />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("admin-layout-classic")).toBeDefined();
    });
  });

  it("ignores unknown surface ids and returns legacy", async () => {
    const { admin, resolver, store } = await freshImport();
    store.useThemeStore.getState().setActiveSurface("ghost-surface-42");
    resolver.__setSurfaceSettingsSnapshot({
      infrastructureEnabled: true,
      defaultAdmin: "legacy",
      defaultUser: "legacy",
      atriumEnabled: false,
      bridgeEnabled: false,
      canvasEnabled: false,
      loaded: true,
    });
    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<admin.DynamicAdminLayout />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("admin-layout-classic")).toBeDefined();
    });
  });
});
