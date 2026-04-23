/**
 * SurfaceActiveBadge smoke test — Aurora-only runtime.
 *
 * Verifies the small header badge wired up by `AppHeader` renders:
 *   1. aktif surface adini (Aurora / Legacy)
 *   2. reason kategorisi rozetini ("Tercihinizle" / "Varsayilan" / "Fallback")
 *   3. tooltip (title / aria-label) reason aciklamasini icerir
 *   4. `data-reason-category` attribute'u resolver kategorisiyle esit
 *   5. fallback durumunda (kill-switch off) warning kategorisine dondurulur
 *
 * Bu test yalnizca bilgi rozetinin dogru render'ini garanti altina alir;
 * gercek resolver mantigi `surfaces-resolver.unit.test.ts` ve diger
 * `surfaces-*.smoke.test.tsx` dosyalari tarafindan test ediliyor.
 *
 * Not: Atrium/Bridge/Canvas yuzeyleri Aurora-only cleanup dalgasinda
 * silindi; bu yuzden testler artik aurora + legacy + horizon uzerinden
 * yapiliyor.
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

function snapshotAuroraEnabled(defaults: {
  admin: string | null;
  user: string | null;
}) {
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: true,
    defaultAdmin: defaults.admin,
    defaultUser: defaults.user,
    auroraEnabled: true,
    loaded: true,
  });
}

function snapshotAuroraGated() {
  // Aurora kapali; resolver legacy safety-net'e duser.
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: true,
    defaultAdmin: "aurora",
    defaultUser: "aurora",
    auroraEnabled: false,
    loaded: true,
  });
}

function snapshotKillSwitchOff() {
  __setSurfaceSettingsSnapshot({
    infrastructureEnabled: false, // <-- kill switch off
    defaultAdmin: "aurora",
    defaultUser: "aurora",
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

describe("SurfaceActiveBadge — Aurora-only smoke", () => {
  beforeEach(async () => {
    await bootRegistry();
    resetActiveSurface(null);
  });

  afterEach(() => {
    cleanup();
    __resetSurfaceSettingsSnapshot();
    resetActiveSurface(null);
  });

  it("renders admin badge with aurora + 'Varsayilan' kategorisi when admin default=aurora", () => {
    snapshotAuroraEnabled({ admin: "aurora", user: "aurora" });
    render(<SurfaceActiveBadge area="Admin" />);
    const badge = screen.getByTestId("header-surface-active-badge-admin");
    expect(badge).toBeDefined();
    expect(badge.getAttribute("data-surface-id")).toBe("aurora");
    expect(badge.getAttribute("data-reason")).toBe("role-default");
    expect(badge.getAttribute("data-reason-category")).toBe("default");
    const category = screen.getByTestId("header-surface-active-category-admin");
    expect(category.textContent).toBe("Varsayilan");
  });

  it("renders user badge with aurora + 'Varsayilan' when user default=aurora", () => {
    snapshotAuroraEnabled({ admin: "aurora", user: "aurora" });
    render(<SurfaceActiveBadge area="User" />);
    const badge = screen.getByTestId("header-surface-active-badge-user");
    expect(badge.getAttribute("data-surface-id")).toBe("aurora");
    expect(badge.getAttribute("data-reason")).toBe("role-default");
    expect(badge.getAttribute("data-reason-category")).toBe("default");
  });

  it("reflects explicit user preference with 'Tercihinizle' kategorisi", () => {
    snapshotAuroraEnabled({ admin: "aurora", user: "aurora" });
    // Kullanici legacy'i acikca tercih ediyor — 'user-preference' bekleniyor.
    resetActiveSurface("legacy");
    render(<SurfaceActiveBadge area="User" />);
    const badge = screen.getByTestId("header-surface-active-badge-user");
    expect(badge.getAttribute("data-surface-id")).toBe("legacy");
    expect(badge.getAttribute("data-reason")).toBe("user-preference");
    expect(badge.getAttribute("data-reason-category")).toBe("explicit");
    const category = screen.getByTestId("header-surface-active-category-user");
    expect(category.textContent).toBe("Tercihinizle");
  });

  it("falls to legacy safety-net when explicit aurora is picked but gate is off", () => {
    snapshotAuroraGated();
    resetActiveSurface("aurora");
    render(<SurfaceActiveBadge area="User" />);
    const badge = screen.getByTestId("header-surface-active-badge-user");
    // Aurora kapali oldugu icin role-default `aurora` da reddediliyor; resolver
    // safety-net olan legacy'a duser. Reason role-default DEGIL, fallback
    // ailesinden bir reason olur (legacy-fallback). Kategori 'fallback' olur.
    expect(badge.getAttribute("data-surface-id")).toBe("legacy");
    expect(badge.getAttribute("data-reason-category")).toBe("fallback");
  });

  it("shows warning fallback category when kill switch is off", () => {
    snapshotKillSwitchOff();
    resetActiveSurface("aurora");
    render(<SurfaceActiveBadge area="User" />);
    const badge = screen.getByTestId("header-surface-active-badge-user");
    expect(badge.getAttribute("data-surface-id")).toBe("legacy");
    expect(badge.getAttribute("data-reason")).toBe("kill-switch-off");
    expect(badge.getAttribute("data-reason-category")).toBe("fallback");
    const category = screen.getByTestId("header-surface-active-category-user");
    expect(category.textContent).toBe("Fallback");
  });

  it("renders an accessible tooltip that includes the surface id and reason text", () => {
    snapshotAuroraEnabled({ admin: "aurora", user: "aurora" });
    render(<SurfaceActiveBadge area="Admin" />);
    const badge = screen.getByTestId("header-surface-active-badge-admin");
    const title = badge.getAttribute("title") ?? "";
    expect(title).toContain("aurora");
    expect(badge.getAttribute("aria-label")).toBe(title);
  });
});
