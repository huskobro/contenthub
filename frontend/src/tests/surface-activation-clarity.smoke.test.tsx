/**
 * Surface activation clarity — Faz 4D smoke test.
 *
 * SurfacePickerSection'in Faz 4D'de kazandigi UX netligini dogrular:
 *
 *   B. Status panel (altyapi / aktif / neden / tercihiniz) — dort satir
 *   D. "onerilen" rozeti yalnizca role-default ve selectable kartta
 *   E. Inline activation feedback — success tonu + warning tonu (fallback)
 *   C. Scope mismatch metni artik pozitif yonlendirme iceriyor
 *
 * Strateji:
 *   - `useSurfaceResolution`'in snapshot'ini `__setSurfaceSettingsSnapshot` ile
 *     deterministik olarak sabitliyoruz (fetch yok, network yok).
 *   - `useThemeStore.setActiveSurface` gercek store uzerinde calisiyor; testler
 *     `setActiveSurface(null)` ile baslatiyor ki lastAction sifirlansin.
 *   - React Query surface picker'da yok; ama SectionShell/ActionButton bagimsiz.
 *     Yine de QueryClientProvider sarmamak icin "plain render" yeterli.
 */

import React from "react";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { SurfacePickerSection } from "../components/surfaces/SurfacePickerSection";
import {
  __setSurfaceSettingsSnapshot,
  __resetSurfaceSettingsSnapshot,
  type SurfaceSettingsSnapshot,
} from "../surfaces/useSurfaceResolution";
import { useThemeStore } from "../stores/themeStore";
import { describeIneligibleReason } from "../surfaces/selectableSurfaces";

// Varsayilan "sagliklu" snapshot: altyapi acik, bridge admin-default, canvas
// user-default, uc yuzey de enabled. Testler bu snapshot'i baz alip gerektiginde
// ezerler.
const HEALTHY_SNAPSHOT: SurfaceSettingsSnapshot = {
  infrastructureEnabled: true,
  defaultAdmin: "bridge",
  defaultUser: "canvas",
  atriumEnabled: true,
  bridgeEnabled: true,
  canvasEnabled: true,
  auroraEnabled: true,
  loaded: true,
};

function applySnapshot(partial: Partial<SurfaceSettingsSnapshot> = {}) {
  __setSurfaceSettingsSnapshot({ ...HEALTHY_SNAPSHOT, ...partial });
}

beforeEach(() => {
  // Explicit tercihi sifirla — her test temiz state ile basliyor.
  useThemeStore.getState().setActiveSurface(null);
  applySnapshot();
});

afterEach(() => {
  cleanup();
  __resetSurfaceSettingsSnapshot();
  useThemeStore.getState().setActiveSurface(null);
});

describe("Faz 4D — SurfacePickerSection status panel (Task B)", () => {
  it("user scope: renders 4 status rows with default values", () => {
    render(<SurfacePickerSection scope="user" />);

    const panel = screen.getByTestId("surface-picker-status-panel-user");
    expect(panel).toBeDefined();

    const infra = screen.getByTestId("surface-picker-status-infra");
    expect(infra.textContent).toMatch(/altyapi/i);
    expect(infra.textContent).toMatch(/acik/i);

    const active = screen.getByTestId("surface-picker-status-active");
    // Default user = canvas
    expect(active.textContent).toMatch(/canvas/i);

    const reason = screen.getByTestId("surface-picker-status-reason");
    expect(reason.textContent).toMatch(/bu panelde aktif|neden/i);

    const preference = screen.getByTestId("surface-picker-status-preference");
    // Hic explicit tercih yok
    expect(preference.textContent).toMatch(/yok|varsayilan/i);
  });

  it("admin scope: status panel reports infra=Kapali when kill-switch off", () => {
    applySnapshot({ infrastructureEnabled: false });
    render(<SurfacePickerSection scope="admin" />);

    const infra = screen.getByTestId("surface-picker-status-infra");
    expect(infra.textContent).toMatch(/kapali/i);
  });

  it("status panel reflects explicit preference in 'Tercihiniz' row", () => {
    useThemeStore.getState().setActiveSurface("atrium");
    render(<SurfacePickerSection scope="user" />);

    const preference = screen.getByTestId("surface-picker-status-preference");
    expect(preference.textContent).toMatch(/atrium/i);
  });
});

describe("Faz 4D — recommended badge (Task D)", () => {
  it("user scope: 'onerilen' badge appears only on canvas (role default)", () => {
    render(<SurfacePickerSection scope="user" />);

    const canvasBadge = screen.queryByTestId("surface-picker-recommended-canvas");
    expect(canvasBadge).not.toBeNull();
    expect(canvasBadge?.textContent?.toLowerCase()).toMatch(/onerilen/);

    // Atrium selectable ama role-default degil — rozet yok.
    expect(screen.queryByTestId("surface-picker-recommended-atrium")).toBeNull();
    // Legacy/horizon bootstrap, default degil — rozet yok.
    expect(screen.queryByTestId("surface-picker-recommended-legacy")).toBeNull();
    expect(screen.queryByTestId("surface-picker-recommended-horizon")).toBeNull();
  });

  it("admin scope: 'onerilen' badge appears on bridge", () => {
    render(<SurfacePickerSection scope="admin" />);

    const bridgeBadge = screen.queryByTestId("surface-picker-recommended-bridge");
    expect(bridgeBadge).not.toBeNull();
    expect(bridgeBadge?.textContent?.toLowerCase()).toMatch(/onerilen/);

    // Canvas user-scope, admin panelde scope-mismatch — rozet kesinlikle yok.
    expect(screen.queryByTestId("surface-picker-recommended-canvas")).toBeNull();
  });
});

describe("Faz 4D — inline activation feedback (Task E)", () => {
  it("clicking Aktif Et on a usable surface shows success feedback", () => {
    render(<SurfacePickerSection scope="user" />);

    // Canvas zaten aktif (role default). Atrium selectable ve baska — onu secelim.
    const atriumActivate = screen.getByTestId("surface-picker-activate-atrium");
    fireEvent.click(atriumActivate);

    const feedback = screen.getByTestId("surface-picker-activation-feedback-user");
    expect(feedback.getAttribute("data-tone")).toBe("success");
    expect(feedback.textContent).toMatch(/atrium/i);
    expect(feedback.textContent).toMatch(/goruntuleniyor/i);
  });

  it("clicking Varsayilana don shows reset success feedback", () => {
    useThemeStore.getState().setActiveSurface("atrium");
    render(<SurfacePickerSection scope="user" />);

    const reset = screen.getByTestId("surface-picker-reset");
    fireEvent.click(reset);

    const feedback = screen.getByTestId("surface-picker-activation-feedback-user");
    expect(feedback.getAttribute("data-tone")).toBe("success");
    expect(feedback.textContent).toMatch(/tercihiniz temizlendi/i);
  });

  it("no feedback shown before any user action", () => {
    render(<SurfacePickerSection scope="user" />);
    expect(
      screen.queryByTestId("surface-picker-activation-feedback-user"),
    ).toBeNull();
  });
});

describe("Faz 4D — scope mismatch positive guidance (Task C)", () => {
  it("admin panel + user-only surface message mentions bridge/legacy/horizon", () => {
    const msg = describeIneligibleReason("scope-mismatch", {
      panelScope: "admin",
      surfaceScope: "user",
    });
    expect(msg.toLowerCase()).toMatch(/bridge/);
    expect(msg.toLowerCase()).toMatch(/legacy/);
    expect(msg.toLowerCase()).toMatch(/horizon/);
    // Kullaniciya yonelik yonlendirme dili
    expect(msg.toLowerCase()).toMatch(/kullanabilirsiniz/);
  });

  it("user panel + admin-only surface message mentions canvas/atrium/legacy/horizon", () => {
    const msg = describeIneligibleReason("scope-mismatch", {
      panelScope: "user",
      surfaceScope: "admin",
    });
    expect(msg.toLowerCase()).toMatch(/canvas/);
    expect(msg.toLowerCase()).toMatch(/atrium/);
    expect(msg.toLowerCase()).toMatch(/legacy/);
    expect(msg.toLowerCase()).toMatch(/horizon/);
    expect(msg.toLowerCase()).toMatch(/kullanabilirsiniz/);
  });

  it("scope mismatch with no opts keeps legacy generic text", () => {
    const msg = describeIneligibleReason("scope-mismatch");
    expect(msg.toLowerCase()).toMatch(/scope mismatch/);
  });

  // Faz 4E: scope-mismatch cards are no longer rendered at all. The
  // describeIneligibleReason("scope-mismatch", ...) helper still exists for
  // backward compatibility (callers may build their own labels), but the
  // picker UI never surfaces it. Verify absence.
  //
  // Faz 5: canvas was promoted from user-scope to `both` scope — it is now
  // a valid choice on the admin panel as well. The scope-filter invariant
  // is covered via buildScopedSurfacePickerEntries unit tests with
  // synthetic admin-only / user-only manifests.
  it("admin panel renders canvas card (scope=both after Faz 5)", () => {
    render(<SurfacePickerSection scope="admin" />);
    expect(screen.queryByTestId("surface-picker-card-canvas")).toBeDefined();
    expect(screen.queryByTestId("surface-picker-ineligible-canvas")).toBeNull();
  });
});
