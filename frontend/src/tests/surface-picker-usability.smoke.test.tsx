/**
 * SurfacePickerSection usability smoke test — Aurora-only runtime.
 *
 * Originally Faz 4C usability test; rewritten in the Aurora-only cleanup
 * wave to use the three surfaces that exist today (legacy, horizon,
 * aurora). Atrium / Bridge / Canvas surfaces and their snapshot fields
 * were removed alongside their source modules.
 *
 * What we still verify (unchanged contract):
 *   1. manifest.bestFor listesi her kart icin render ediliyor
 *   2. aktif karta reason etiketi eklendi (`data-reason` + Turkce metin)
 *   3. reason kategorisi (`data-reason-category`) resolver reason'una gore
 *      "explicit" / "default" / "fallback" olarak ayirt ediliyor
 *   4. explicit tercih kullanilamiyorsa ("userPreferenceUnusable") kart
 *      "preference marker"ini gosteriyor ve "tercih kullanilmiyor" notu
 *      render ediliyor
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { act } from "react";
import { SurfacePickerSection } from "../components/surfaces/SurfacePickerSection";
import { useThemeStore } from "../stores/themeStore";
import {
  __setSurfaceSettingsSnapshot,
  __resetSurfaceSettingsSnapshot,
} from "../surfaces/useSurfaceResolution";
import { __resetSurfaceRegistry } from "../surfaces/registry";

async function bootRegistry() {
  __resetSurfaceRegistry();
  const mod = await import("../surfaces/manifests/register");
  mod.registerBuiltinSurfaces();
}

function snapshot(opts: {
  infrastructureEnabled?: boolean;
  auroraEnabled?: boolean;
  defaultAdmin?: string | null;
  defaultUser?: string | null;
} = {}) {
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: opts.infrastructureEnabled ?? true,
    defaultAdmin: opts.defaultAdmin ?? "aurora",
    defaultUser: opts.defaultUser ?? "aurora",
    auroraEnabled: opts.auroraEnabled ?? true,
    loaded: true,
  });
}

function resetActiveSurface(id: string | null = null) {
  act(() => {
    useThemeStore.getState().setActiveSurface(id);
  });
}

describe("SurfacePickerSection — Aurora-only usability", () => {
  beforeEach(async () => {
    await bootRegistry();
    snapshot();
    resetActiveSurface(null);
  });

  afterEach(() => {
    cleanup();
    __resetSurfaceSettingsSnapshot();
    resetActiveSurface(null);
  });

  // -------------------------------------------------------------------------
  // 1. bestFor bullet listesi her kart icin render ediliyor
  // -------------------------------------------------------------------------

  it("renders bestFor bullet list for every built-in surface on user scope", () => {
    render(<SurfacePickerSection scope="user" />);
    for (const id of ["legacy", "horizon", "aurora"] as const) {
      expect(
        screen.getByTestId(`surface-picker-bestfor-${id}`),
      ).toBeDefined();
      const items = screen.getAllByTestId(
        `surface-picker-bestfor-item-${id}`,
      );
      expect(items.length).toBeGreaterThanOrEqual(2);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Aktif kartta reason etiketi
  // -------------------------------------------------------------------------

  it("role-default resolved surface gets 'Varsayilan' reason badge on its card", () => {
    render(<SurfacePickerSection scope="user" />);
    // Hicbir explicit tercih yok, user default=aurora → aurora resolved.
    const reason = screen.getByTestId("surface-picker-reason-aurora");
    expect(reason.getAttribute("data-reason")).toBe("role-default");
    expect(reason.getAttribute("data-reason-category")).toBe("default");
    expect(reason.textContent).toMatch(/varsayilan/i);
  });

  it("explicit user preference gets 'Tercihinizle' reason badge on its card", () => {
    resetActiveSurface("legacy");
    render(<SurfacePickerSection scope="user" />);
    const reason = screen.getByTestId("surface-picker-reason-legacy");
    expect(reason.getAttribute("data-reason")).toBe("user-preference");
    expect(reason.getAttribute("data-reason-category")).toBe("explicit");
    expect(reason.textContent).toMatch(/tercih/i);
  });

  it("kill-switch off produces 'Fallback' badge on legacy card", () => {
    snapshot({ infrastructureEnabled: false });
    resetActiveSurface("aurora");
    render(<SurfacePickerSection scope="user" />);
    const reason = screen.getByTestId("surface-picker-reason-legacy");
    expect(reason.getAttribute("data-reason")).toBe("kill-switch-off");
    expect(reason.getAttribute("data-reason-category")).toBe("fallback");
  });

  // -------------------------------------------------------------------------
  // 3. userPreferenceUnusable — explicit tercih fallback'e dustu
  // -------------------------------------------------------------------------

  it("marks explicit-but-unusable preference with preference-unusable note", () => {
    // Aurora gate kapali, kullanici aurora secmis; resolver legacy'a dusuyor.
    snapshot({ auroraEnabled: false });
    resetActiveSurface("aurora");
    render(<SurfacePickerSection scope="user" />);

    // Aurora karti hala listede — ama "Aktif" rozeti yerine "Tercih (kullanilmiyor)".
    expect(
      screen.queryByTestId("surface-picker-active-marker-aurora"),
    ).toBeNull();
    expect(
      screen.getByTestId("surface-picker-preference-marker-aurora"),
    ).toBeDefined();
    expect(
      screen.getByTestId("surface-picker-preference-unusable-aurora"),
    ).toBeDefined();

    // Legacy resolver tarafindan aktif → Aktif rozeti + reason etiketi legacy'da.
    expect(
      screen.getByTestId("surface-picker-active-marker-legacy"),
    ).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 4. Legacy + Horizon hala bootstrap rozetiyle
  // -------------------------------------------------------------------------

  it("legacy + horizon still show bootstrap marker", () => {
    render(<SurfacePickerSection scope="user" />);
    expect(
      screen.getByTestId("surface-picker-bootstrap-legacy"),
    ).toBeDefined();
    expect(
      screen.getByTestId("surface-picker-bootstrap-horizon"),
    ).toBeDefined();
  });
});
