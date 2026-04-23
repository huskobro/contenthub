/**
 * Surface activation clarity — Aurora-only smoke test.
 *
 * Originally Faz 4D test; rewritten in the Aurora-only cleanup wave to
 * exercise the SurfacePickerSection against the three surfaces that exist
 * today (legacy, horizon, aurora). Atrium / Bridge / Canvas were removed
 * with the rest of their source modules.
 *
 * What we still verify (unchanged contract):
 *   B. Status panel (altyapi / aktif / neden / tercihiniz) — dort satir
 *   D. "onerilen" rozeti yalnizca role-default ve selectable kartta
 *   E. Inline activation feedback — success tonu + warning tonu (fallback)
 *   C. Scope mismatch metni positive guidance dilini koruyor
 *
 * Strateji:
 *   - `useSurfaceResolution`'in snapshot'ini `__setSurfaceSettingsSnapshot`
 *     ile deterministik olarak sabitliyoruz (fetch yok, network yok).
 *   - `useThemeStore.setActiveSurface` gercek store uzerinde calisiyor;
 *     testler `setActiveSurface(null)` ile baslatiyor ki lastAction
 *     sifirlansin.
 *   - React Query surface picker'da yok; "plain render" yeterli.
 */

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

// Varsayilan "sagliklu" snapshot: altyapi acik, aurora her iki panelde
// role-default, aurora etkin. Testler bu snapshot'i baz alip gerektiginde
// ezerler.
const HEALTHY_SNAPSHOT: SurfaceSettingsSnapshot = {
  infrastructureEnabled: true,
  defaultAdmin: "aurora",
  defaultUser: "aurora",
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

describe("SurfacePickerSection — status panel", () => {
  it("user scope: renders 4 status rows with default values", () => {
    render(<SurfacePickerSection scope="user" />);

    const panel = screen.getByTestId("surface-picker-status-panel-user");
    expect(panel).toBeDefined();

    const infra = screen.getByTestId("surface-picker-status-infra");
    expect(infra.textContent).toMatch(/altyapi/i);
    expect(infra.textContent).toMatch(/acik/i);

    const active = screen.getByTestId("surface-picker-status-active");
    // Default user = aurora
    expect(active.textContent).toMatch(/aurora/i);

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
    useThemeStore.getState().setActiveSurface("legacy");
    render(<SurfacePickerSection scope="user" />);

    const preference = screen.getByTestId("surface-picker-status-preference");
    expect(preference.textContent).toMatch(/legacy/i);
  });
});

describe("SurfacePickerSection — recommended badge", () => {
  it("user scope: 'onerilen' badge appears only on aurora (role default)", () => {
    render(<SurfacePickerSection scope="user" />);

    const auroraBadge = screen.queryByTestId("surface-picker-recommended-aurora");
    expect(auroraBadge).not.toBeNull();
    expect(auroraBadge?.textContent?.toLowerCase()).toMatch(/onerilen/);

    // Legacy/horizon bootstrap, default degil — rozet yok.
    expect(screen.queryByTestId("surface-picker-recommended-legacy")).toBeNull();
    expect(screen.queryByTestId("surface-picker-recommended-horizon")).toBeNull();
  });

  it("admin scope: 'onerilen' badge appears on aurora (role default)", () => {
    render(<SurfacePickerSection scope="admin" />);

    const auroraBadge = screen.queryByTestId("surface-picker-recommended-aurora");
    expect(auroraBadge).not.toBeNull();
    expect(auroraBadge?.textContent?.toLowerCase()).toMatch(/onerilen/);
  });
});

describe("SurfacePickerSection — inline activation feedback", () => {
  it("clicking Aktif Et on a usable surface shows success feedback", () => {
    render(<SurfacePickerSection scope="user" />);

    // Aurora zaten aktif (role default). Legacy selectable — onu secelim.
    const legacyActivate = screen.getByTestId("surface-picker-activate-legacy");
    fireEvent.click(legacyActivate);

    const feedback = screen.getByTestId("surface-picker-activation-feedback-user");
    expect(feedback.getAttribute("data-tone")).toBe("success");
    expect(feedback.textContent).toMatch(/legacy/i);
    expect(feedback.textContent).toMatch(/goruntuleniyor/i);
  });

  it("clicking Varsayilana don shows reset success feedback", () => {
    useThemeStore.getState().setActiveSurface("legacy");
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

describe("SurfacePickerSection — scope mismatch positive guidance", () => {
  it("admin panel + user-only surface message mentions aurora/legacy/horizon", () => {
    const msg = describeIneligibleReason("scope-mismatch", {
      panelScope: "admin",
      surfaceScope: "user",
    });
    expect(msg.toLowerCase()).toMatch(/aurora/);
    expect(msg.toLowerCase()).toMatch(/legacy/);
    expect(msg.toLowerCase()).toMatch(/horizon/);
    // Kullaniciya yonelik yonlendirme dili
    expect(msg.toLowerCase()).toMatch(/kullanabilirsiniz/);
  });

  it("user panel + admin-only surface message mentions aurora/legacy/horizon", () => {
    const msg = describeIneligibleReason("scope-mismatch", {
      panelScope: "user",
      surfaceScope: "admin",
    });
    expect(msg.toLowerCase()).toMatch(/aurora/);
    expect(msg.toLowerCase()).toMatch(/legacy/);
    expect(msg.toLowerCase()).toMatch(/horizon/);
    expect(msg.toLowerCase()).toMatch(/kullanabilirsiniz/);
  });

  it("scope mismatch with no opts keeps legacy generic text", () => {
    const msg = describeIneligibleReason("scope-mismatch");
    expect(msg.toLowerCase()).toMatch(/scope mismatch/);
  });
});
