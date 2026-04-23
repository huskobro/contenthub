/**
 * SurfacePickerSection smoke test — Aurora-only runtime.
 *
 * Mounts the component in isolation against a stubbed
 * `useSurfaceResolution` (so the module-level snapshot is deterministic)
 * and asserts the picker still wires the helper + the theme store + the
 * settings snapshot correctly after the Aurora-only cleanup wave.
 *
 * Originally Faz 4A; rewritten to use the three surfaces that exist
 * today (legacy, horizon, aurora). Atrium / Bridge / Canvas surfaces and
 * their snapshot fields were removed alongside their source modules.
 *
 * Asserts:
 *   1. admin scope → cards for legacy + horizon + aurora are present.
 *   2. user scope  → same three cards (all are scope="both").
 *   3. clicking "Aktif Et" calls `themeStore.setActiveSurface(id)`.
 *   4. clicking "Varsayilana don" calls `setActiveSurface(null)`.
 *   5. `activeSurfaceId` from the store is reflected as an "Aktif" badge
 *      on the matching card and the action button disappears.
 *   6. when aurora is gated OFF in the snapshot, the aurora card shows
 *      an "ineligible" reason and no activate button.
 *
 * The actual selectable logic is covered by
 * `selectable-surfaces.unit.test.ts` — here we only verify that the React
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

describe("SurfacePickerSection — Aurora-only smoke", () => {
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

  it("renders admin scope — legacy + horizon + aurora cards present", async () => {
    render(<SurfacePickerSection scope="admin" />);
    expect(screen.getByTestId("surface-picker-admin")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-legacy")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-horizon")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-aurora")).toBeDefined();
    expect(screen.getByTestId("surface-picker-activate-aurora")).toBeDefined();
  });

  it("renders user scope — legacy + horizon + aurora all selectable", async () => {
    render(<SurfacePickerSection scope="user" />);
    expect(screen.getByTestId("surface-picker-user")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-legacy")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-horizon")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-aurora")).toBeDefined();
    expect(screen.getByTestId("surface-picker-activate-aurora")).toBeDefined();
  });

  it("clicking Aktif Et calls setActiveSurface with the picked id", async () => {
    const spy = vi.spyOn(useThemeStore.getState(), "setActiveSurface");
    render(<SurfacePickerSection scope="user" />);
    const btn = screen.getByTestId("surface-picker-activate-legacy");
    act(() => {
      fireEvent.click(btn);
    });
    // After click, the store's activeSurfaceId should be "legacy".
    expect(useThemeStore.getState().activeSurfaceId).toBe("legacy");
    spy.mockRestore();
  });

  it("active entry shows the Aktif marker and hides its activate button", async () => {
    resetThemeStoreSurface("legacy");
    render(<SurfacePickerSection scope="user" />);
    expect(
      screen.getByTestId("surface-picker-active-marker-legacy"),
    ).toBeDefined();
    expect(
      screen.queryByTestId("surface-picker-activate-legacy"),
    ).toBeNull();
    // Other surfaces still have their activate buttons.
    expect(screen.getByTestId("surface-picker-activate-horizon")).toBeDefined();
    expect(screen.getByTestId("surface-picker-activate-aurora")).toBeDefined();
  });

  it("Varsayilana don button clears the active surface preference", async () => {
    resetThemeStoreSurface("legacy");
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

  it("when aurora is gated OFF in snapshot, the aurora card is ineligible (admin-gate-off)", async () => {
    __setSurfaceSettingsSnapshot({
      infrastructureEnabled: true,
      defaultAdmin: null,
      defaultUser: null,
      auroraEnabled: false, // <-- aurora kapali
      loaded: true,
    });
    render(<SurfacePickerSection scope="admin" />);
    // Aurora is registered (both-scope) so it appears in the admin list,
    // but the admin gate is off → ineligible with admin-gate-off reason.
    expect(screen.getByTestId("surface-picker-card-aurora")).toBeDefined();
    expect(screen.getByTestId("surface-picker-ineligible-aurora")).toBeDefined();
    expect(
      screen.queryByTestId("surface-picker-activate-aurora"),
    ).toBeNull();
    // Bootstrap surfaces still work.
    expect(screen.getByTestId("surface-picker-card-legacy")).toBeDefined();
    expect(screen.getByTestId("surface-picker-card-horizon")).toBeDefined();
  });

  it("status + scope badges render per card", async () => {
    render(<SurfacePickerSection scope="user" />);
    expect(screen.getByTestId("surface-picker-status-aurora")).toBeDefined();
    expect(screen.getByTestId("surface-picker-scope-aurora")).toBeDefined();
    expect(screen.getByTestId("surface-picker-status-legacy")).toBeDefined();
    expect(screen.getByTestId("surface-picker-scope-legacy")).toBeDefined();
  });
});
