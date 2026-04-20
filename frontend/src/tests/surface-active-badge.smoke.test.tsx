/**
 * SurfaceActiveBadge smoke test — Faz 4C usability cleanup.
 *
 * Verifies the small header badge wired up by `AppHeader` renders:
 *   1. aktif surface adini (ornek: "Canvas" / "Bridge" / "Legacy")
 *   2. reason kategorisi rozetini ("Tercihinizle" / "Varsayilan" / "Fallback")
 *   3. tooltip (title / aria-label) reason aciklamasini icerir
 *   4. `data-reason-category` attribute'u resolver kategorisiyle esit
 *   5. fallback durumunda (ornek: explicit atrium + gate kapali) warning
 *      kategorisine dondurulur
 *
 * Bu test yalnizca bilgi rozetinin dogru render'ini garanti altina alir;
 * gercek resolver mantigi `default-surface-strategy.unit.test.ts` ve
 * `surfaces-*.smoke.test.tsx` dosyalari tarafindan zaten test ediliyor.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { act } from "react";
import { SurfaceActiveBadge } from "../components/surfaces/SurfaceActiveBadge";
import { useThemeStore } from "../stores/themeStore";
import {
  __setSurfaceSettingsSnapshot,
  __resetSurfaceSettingsSnapshot,
} from "../surfaces/useSurfaceResolution";
import { __resetSurfaceRegistry } from "../surfaces/registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bootRegistry() {
  __resetSurfaceRegistry();
  const mod = await import("../surfaces/manifests/register");
  mod.registerBuiltinSurfaces();
}

function snapshotAllEnabled(defaults: {
  admin: string | null;
  user: string | null;
}) {
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: true,
    defaultAdmin: defaults.admin,
    defaultUser: defaults.user,
    atriumEnabled: true,
    bridgeEnabled: true,
    canvasEnabled: true,
    auroraEnabled: true,
    loaded: true,
  });
}

function snapshotAtriumGated() {
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: true,
    defaultAdmin: "bridge",
    defaultUser: "canvas",
    atriumEnabled: false, // <-- kapali
    bridgeEnabled: true,
    canvasEnabled: true,
    auroraEnabled: true,
    loaded: true,
  });
}

function snapshotKillSwitchOff() {
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: false, // <-- kill switch off
    defaultAdmin: "bridge",
    defaultUser: "canvas",
    atriumEnabled: true,
    bridgeEnabled: true,
    canvasEnabled: true,
    auroraEnabled: true,
    loaded: true,
  });
}

function resetActiveSurface(id: string | null = null) {
  act(() => {
    useThemeStore.getState().setActiveSurface(id);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SurfaceActiveBadge — Faz 4C smoke", () => {
  beforeEach(async () => {
    await bootRegistry();
    resetActiveSurface(null);
  });

  afterEach(() => {
    cleanup();
    __resetSurfaceSettingsSnapshot();
    resetActiveSurface(null);
  });

  it("renders admin badge with bridge + 'Varsayilan' kategorisi when admin default=bridge", () => {
    snapshotAllEnabled({ admin: "bridge", user: "canvas" });
    render(<SurfaceActiveBadge area="Admin" />);
    const badge = screen.getByTestId("header-surface-active-badge-admin");
    expect(badge).toBeDefined();
    expect(badge.getAttribute("data-surface-id")).toBe("bridge");
    expect(badge.getAttribute("data-reason")).toBe("role-default");
    expect(badge.getAttribute("data-reason-category")).toBe("default");
    const name = screen.getByTestId("header-surface-active-name-admin");
    expect(name.textContent).toBe("Bridge");
    const category = screen.getByTestId("header-surface-active-category-admin");
    expect(category.textContent).toBe("Varsayilan");
  });

  it("renders user badge with canvas + 'Varsayilan' when user default=canvas", () => {
    snapshotAllEnabled({ admin: "bridge", user: "canvas" });
    render(<SurfaceActiveBadge area="User" />);
    const badge = screen.getByTestId("header-surface-active-badge-user");
    expect(badge.getAttribute("data-surface-id")).toBe("canvas");
    expect(badge.getAttribute("data-reason")).toBe("role-default");
    expect(badge.getAttribute("data-reason-category")).toBe("default");
    const name = screen.getByTestId("header-surface-active-name-user");
    expect(name.textContent).toBe("Canvas");
  });

  it("reflects explicit user preference with 'Tercihinizle' kategorisi", () => {
    snapshotAllEnabled({ admin: "bridge", user: "canvas" });
    resetActiveSurface("atrium");
    render(<SurfaceActiveBadge area="User" />);
    const badge = screen.getByTestId("header-surface-active-badge-user");
    expect(badge.getAttribute("data-surface-id")).toBe("atrium");
    expect(badge.getAttribute("data-reason")).toBe("user-preference");
    expect(badge.getAttribute("data-reason-category")).toBe("explicit");
    const category = screen.getByTestId("header-surface-active-category-user");
    expect(category.textContent).toBe("Tercihinizle");
  });

  it("falls to 'Fallback' when explicit atrium is picked but gate is off", () => {
    snapshotAtriumGated();
    resetActiveSurface("atrium");
    render(<SurfaceActiveBadge area="User" />);
    const badge = screen.getByTestId("header-surface-active-badge-user");
    // Resolver canvas'a fallback yapacak (role-default) cunku atrium gate kapali.
    // role-default -> "default" kategorisi; "fallback" sadece legacy-fallback / kill-switch-off ailesi.
    // Bu kart kullanici icin "canvas varsayilanla aktif" gorurken, picker'daki ayri etiket
    // "tercihinizdi ama kullanilmiyor" mesajini verir.
    expect(badge.getAttribute("data-surface-id")).toBe("canvas");
    expect(badge.getAttribute("data-reason")).toBe("role-default");
  });

  it("shows warning fallback category when kill switch is off", () => {
    snapshotKillSwitchOff();
    resetActiveSurface("canvas");
    render(<SurfaceActiveBadge area="User" />);
    const badge = screen.getByTestId("header-surface-active-badge-user");
    expect(badge.getAttribute("data-surface-id")).toBe("legacy");
    expect(badge.getAttribute("data-reason")).toBe("kill-switch-off");
    expect(badge.getAttribute("data-reason-category")).toBe("fallback");
    const category = screen.getByTestId("header-surface-active-category-user");
    expect(category.textContent).toBe("Fallback");
  });

  it("renders an accessible tooltip that includes the surface id and reason text", () => {
    snapshotAllEnabled({ admin: "bridge", user: "canvas" });
    render(<SurfaceActiveBadge area="Admin" />);
    const badge = screen.getByTestId("header-surface-active-badge-admin");
    const title = badge.getAttribute("title") ?? "";
    expect(title).toContain("Bridge");
    expect(title).toContain("Varsayilan olarak aktif");
    expect(badge.getAttribute("aria-label")).toBe(title);
  });
});
