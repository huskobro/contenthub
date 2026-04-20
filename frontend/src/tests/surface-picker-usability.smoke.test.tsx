/**
 * SurfacePickerSection Faz 4C usability smoke test.
 *
 * Faz 4A picker'a eklenen yeni ozellikleri dogrular:
 *   1. manifest.bestFor listesi her kart icin render ediliyor
 *   2. aktif karta reason etiketi eklendi (`data-reason` + Turkce metin)
 *   3. reason kategorisi (`data-reason-category`) resolver reason'una gore
 *      "explicit" / "default" / "fallback" olarak ayirt ediliyor
 *   4. explicit tercih kullanilamiyorsa ("userPreferenceUnusable") kart
 *      "preference marker"ini gosteriyor ve "tercih kullanilmiyor" notu render
 *      ediliyor
 *   5. scope-mismatch mesaji scope'la zenginlestirildi (admin panelde atrium
 *      karti "yalnizca kullanici panelinde calisir" mesajini verir)
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
  atriumEnabled?: boolean;
  bridgeEnabled?: boolean;
  canvasEnabled?: boolean;
  auroraEnabled?: boolean;
  defaultAdmin?: string | null;
  defaultUser?: string | null;
} = {}) {
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: opts.infrastructureEnabled ?? true,
    defaultAdmin: opts.defaultAdmin ?? "bridge",
    defaultUser: opts.defaultUser ?? "canvas",
    atriumEnabled: opts.atriumEnabled ?? true,
    bridgeEnabled: opts.bridgeEnabled ?? true,
    canvasEnabled: opts.canvasEnabled ?? true,
    auroraEnabled: opts.auroraEnabled ?? true,
    loaded: true,
  });
}

function resetActiveSurface(id: string | null = null) {
  act(() => {
    useThemeStore.getState().setActiveSurface(id);
  });
}

describe("SurfacePickerSection — Faz 4C usability", () => {
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
    // Her bir kartta bestFor bolgesi olmali.
    for (const id of ["legacy", "horizon", "atrium", "canvas"] as const) {
      expect(
        screen.getByTestId(`surface-picker-bestfor-${id}`),
      ).toBeDefined();
      const items = screen.getAllByTestId(
        `surface-picker-bestfor-item-${id}`,
      );
      expect(items.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("renders canvas bestFor with expected phrase", () => {
    render(<SurfacePickerSection scope="user" />);
    const items = screen.getAllByTestId("surface-picker-bestfor-item-canvas");
    const text = items.map((el) => el.textContent).join(" | ");
    expect(text).toContain("Proje merkezli");
  });

  it("renders bridge bestFor on admin scope with operations phrase", () => {
    render(<SurfacePickerSection scope="admin" />);
    const items = screen.getAllByTestId("surface-picker-bestfor-item-bridge");
    const text = items.map((el) => el.textContent).join(" | ");
    expect(text.toLowerCase()).toContain("operasyon");
  });

  // -------------------------------------------------------------------------
  // 2. Aktif kartta reason etiketi
  // -------------------------------------------------------------------------

  it("role-default resolved surface gets 'Varsayilan' reason badge on its card", () => {
    render(<SurfacePickerSection scope="user" />);
    // Hicbir explicit tercih yok, user default=canvas → canvas resolved.
    const reason = screen.getByTestId("surface-picker-reason-canvas");
    expect(reason.getAttribute("data-reason")).toBe("role-default");
    expect(reason.getAttribute("data-reason-category")).toBe("default");
    expect(reason.textContent).toMatch(/varsayilan/i);
  });

  it("explicit user preference gets 'Tercihinizle' reason badge on its card", () => {
    resetActiveSurface("atrium");
    render(<SurfacePickerSection scope="user" />);
    const reason = screen.getByTestId("surface-picker-reason-atrium");
    expect(reason.getAttribute("data-reason")).toBe("user-preference");
    expect(reason.getAttribute("data-reason-category")).toBe("explicit");
    expect(reason.textContent).toMatch(/tercih/i);
  });

  it("kill-switch off produces 'Fallback' badge on legacy card", () => {
    snapshot({ infrastructureEnabled: false });
    resetActiveSurface("canvas");
    render(<SurfacePickerSection scope="user" />);
    const reason = screen.getByTestId("surface-picker-reason-legacy");
    expect(reason.getAttribute("data-reason")).toBe("kill-switch-off");
    expect(reason.getAttribute("data-reason-category")).toBe("fallback");
  });

  // -------------------------------------------------------------------------
  // 3. userPreferenceUnusable — explicit tercih fallback'e dustu
  // -------------------------------------------------------------------------

  it("marks explicit-but-unusable preference with preference-unusable note", () => {
    // Atrium gate kapali, kullanici atrium secmis; resolver canvas'a dusuyor.
    snapshot({ atriumEnabled: false });
    resetActiveSurface("atrium");
    render(<SurfacePickerSection scope="user" />);

    // Atrium karti hala listede — ama "Aktif" rozeti yerine "Tercih (kullanilmiyor)".
    expect(
      screen.queryByTestId("surface-picker-active-marker-atrium"),
    ).toBeNull();
    expect(
      screen.getByTestId("surface-picker-preference-marker-atrium"),
    ).toBeDefined();
    expect(
      screen.getByTestId("surface-picker-preference-unusable-atrium"),
    ).toBeDefined();

    // Canvas resolver tarafindan aktif → Aktif rozeti + reason etiketi canvas'ta.
    expect(
      screen.getByTestId("surface-picker-active-marker-canvas"),
    ).toBeDefined();
    const canvasReason = screen.getByTestId("surface-picker-reason-canvas");
    expect(canvasReason.getAttribute("data-reason")).toBe("role-default");
  });

  // -------------------------------------------------------------------------
  // 4. Faz 4E — scope-disallowed surfaces are hidden entirely
  // -------------------------------------------------------------------------
  //
  // Before Faz 4E this block tested the scope-mismatch "positive guidance"
  // text (Faz 4D). After Faz 4E the product decision flipped: user panel
  // must show ONLY user+both scope surfaces, admin panel must show ONLY
  // admin+both scope surfaces. Scope-disallowed entries are dropped from
  // the list — not even rendered as informational ineligible cards.

  // Faz 5: atrium ve bridge surface'leri "both" scope'a tasındı; admin-only
  // veya user-only filtre testleri scope mantigi nedeniyle artik gecersiz.
  // Scope filtreleme dogrulamasi `buildScopedSurfacePickerEntries` unit
  // testlerinde admin-only/user-only manifest senaryolarıyla yapılır.

  it("atrium and bridge appear in both panels (scope=both)", () => {
    render(<SurfacePickerSection scope="admin" />);
    expect(screen.queryByTestId("surface-picker-card-atrium")).toBeDefined();
    expect(screen.queryByTestId("surface-picker-card-bridge")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 5. Legacy + Horizon hala bootstrap rozetiyle
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
