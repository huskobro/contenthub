/**
 * SurfacePickerSection smoke test — Faz 4A + Faz 4E + Faz 5 update.
 *
 * Faz 5: Canvas, Atrium ve Bridge surface'ları artık scope="both" — her üçü
 * de hem admin hem user paneli için kendi bağımsız shell'lerini sunar. Bu
 * yüzden surface picker her üç surface'ı hem admin hem user scope'unda
 * seçilebilir olarak listelemelidir. Eski Faz 4E "user-scope surfaces admin
 * panelinde görünmez" assertion'ları artık geçersiz — kaldırıldı.
 *
 * Mounts the component in isolation against a stubbed
 * `useSurfaceResolution` (so the module-level snapshot is deterministic)
 * and asserts:
 *
 *   1. admin scope → shows legacy + horizon + bridge + canvas + atrium.
 *      Faz 5: canvas/atrium artık admin panelinde de seçilebilir.
 *   2. user scope → atrium/canvas/bridge hepsi seçilebilir. Faz 5: bridge
 *      artık user panelinde de seçilebilir.
 *   3. clicking "Aktif Et" on an entry calls themeStore.setActiveSurface
 *      with the manifest id (wires into existing persistence path)
 *   4. clicking "Varsayilana don" calls setActiveSurface(null)
 *   5. `activeSurfaceId` from the store is reflected as an "Aktif" badge on
 *      the matching card and the action button disappears for that card
 *   6. status-disabled or admin-gate-off (but scope-ok) surfaces render
 *      with an "ineligible" etiket and no activate button
 *
 * This is a smoke test — the actual selectable logic is covered by
 * `selectable-surfaces.unit.test.ts`. Here we only verify that the React
 * component wires the helper + the theme store + the settings snapshot
 * correctly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { act } from "react";
import { SurfacePickerSection } from "../components/surfaces/SurfacePickerSection";
import { useThemeStore } from "../stores/themeStore";
import {
  __setSurfaceSettingsSnapshot,
  __resetSurfaceSettingsSnapshot,
} from "../surfaces/useSurfaceResolution";
import {
  __resetSurfaceRegistry,
} from "../surfaces/registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bootRegistry() {
  __resetSurfaceRegistry();
  const mod = await import("../surfaces/manifests/register");
  mod.registerBuiltinSurfaces();
}

function allEnabledSnapshot() {
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: true,
    defaultAdmin: null,
    defaultUser: null,
    atriumEnabled: true,
    bridgeEnabled: true,
    canvasEnabled: true,
    auroraEnabled: true,
    loaded: true,
  });
}

// Reset the theme store's activeSurfaceId to a known value between tests.
function resetThemeStoreSurface(id: string | null = null) {
  act(() => {
    useThemeStore.getState().setActiveSurface(id);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SurfacePickerSection — Faz 4A smoke", () => {
  beforeEach(async () => {
    await bootRegistry();
    allEnabledSnapshot();
    resetThemeStoreSurface(null);
  });

  afterEach(() => {
    cleanup();
    __resetSurfaceSettingsSnapshot();
    resetThemeStoreSurface(null);
  });

  it("renders admin scope — legacy + horizon + bridge + canvas + atrium all present (Faz 5 both-scope)", async () => {
    render(<SurfacePickerSection scope="admin" />);
    expect(screen.getByTestId("surface-picker-admin")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-legacy")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-horizon")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-bridge")).toBeDefined();
    // Faz 5: canvas ve atrium artık scope="both" — admin panelinde de
    // seçilebilir olarak görünmeli (her ikisinin de kendi bağımsız admin
    // shell'i var).
    expect(screen.getByTestId("surface-picker-card-canvas")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-atrium")).toBeDefined();
    expect(screen.getByTestId("surface-picker-activate-canvas")).toBeDefined();
    expect(screen.getByTestId("surface-picker-activate-atrium")).toBeDefined();
  });

  it("renders user scope — legacy + horizon + atrium + canvas + bridge all selectable (Faz 5 both-scope)", async () => {
    render(<SurfacePickerSection scope="user" />);
    expect(screen.getByTestId("surface-picker-user")).toBeDefined();
    // Bootstrap surfaces always present.
    expect(screen.getByTestId("surface-picker-card-legacy")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-horizon")).toBeDefined();
    // Both-scope surfaces: atrium + canvas + bridge have activate buttons.
    expect(screen.getByTestId("surface-picker-activate-atrium")).toBeDefined();
    expect(screen.getByTestId("surface-picker-activate-canvas")).toBeDefined();
    // Faz 5: bridge artık scope="both" — user panelinde de kendi bağımsız
    // user shell'i ile seçilebilir olarak görünmeli.
    expect(screen.getByTestId("surface-picker-card-bridge")).toBeDefined();
    expect(screen.getByTestId("surface-picker-activate-bridge")).toBeDefined();
  });

  it("clicking Aktif Et calls setActiveSurface with the picked id", async () => {
    const spy = vi.spyOn(useThemeStore.getState(), "setActiveSurface");
    // The spy above wraps the current value in getState(), but Zustand selectors
    // read the current slice directly — so we also wrap the store's set function.
    // Simpler: use a setState wrapper.
    render(<SurfacePickerSection scope="user" />);
    const btn = screen.getByTestId("surface-picker-activate-atrium");
    act(() => {
      fireEvent.click(btn);
    });
    // After click, the store's activeSurfaceId should be "atrium".
    expect(useThemeStore.getState().activeSurfaceId).toBe("atrium");
    spy.mockRestore();
  });

  it("active entry shows the Aktif marker and hides its activate button", async () => {
    resetThemeStoreSurface("atrium");
    render(<SurfacePickerSection scope="user" />);
    expect(
      screen.getByTestId("surface-picker-active-marker-atrium"),
    ).toBeDefined();
    expect(
      screen.queryByTestId("surface-picker-activate-atrium"),
    ).toBeNull();
    // Other user-scope surfaces still have their activate buttons.
    expect(screen.getByTestId("surface-picker-activate-canvas")).toBeDefined();
  });

  it("Varsayilana don button clears the active surface preference", async () => {
    resetThemeStoreSurface("atrium");
    render(<SurfacePickerSection scope="user" />);
    const reset = screen.getByTestId("surface-picker-reset");
    act(() => {
      fireEvent.click(reset);
    });
    expect(useThemeStore.getState().activeSurfaceId).toBeNull();
  });

  it("Varsayilana don button is hidden when no active preference exists", async () => {
    resetThemeStoreSurface(null);
    render(<SurfacePickerSection scope="user" />);
    expect(screen.queryByTestId("surface-picker-reset")).toBeNull();
  });

  it("when bridge is gated OFF in snapshot, bridge card shows admin-gate-off", async () => {
    __setSurfaceSettingsSnapshot({
      infrastructureEnabled: true,
      defaultAdmin: null,
      defaultUser: null,
      atriumEnabled: true,
      bridgeEnabled: false,
      canvasEnabled: true,
      auroraEnabled: true,
      loaded: true,
    });
    render(<SurfacePickerSection scope="admin" />);
    // Bridge is admin-scope so it appears in the admin panel list,
    // but the admin gate is off → ineligible with admin-gate-off reason.
    expect(screen.getByTestId("surface-picker-card-bridge")).toBeDefined();
    expect(screen.getByTestId("surface-picker-ineligible-bridge")).toBeDefined();
    expect(
      screen.queryByTestId("surface-picker-activate-bridge"),
    ).toBeNull();
    // Bootstrap surfaces still work.
    expect(screen.getByTestId("surface-picker-card-legacy")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-horizon")).toBeDefined();
  });

  it("status + scope badges render per card", async () => {
    render(<SurfacePickerSection scope="user" />);
    expect(screen.getByTestId("surface-picker-status-atrium")).toBeDefined();
    expect(screen.getByTestId("surface-picker-scope-atrium")).toBeDefined();
    expect(screen.getByTestId("surface-picker-status-canvas")).toBeDefined();
    expect(screen.getByTestId("surface-picker-scope-canvas")).toBeDefined();
  });
});
