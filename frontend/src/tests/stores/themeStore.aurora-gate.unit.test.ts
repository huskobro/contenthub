/**
 * themeStore Aurora gate — short-lived hotfix tests.
 *
 * Verifies the contract documented in CLAUDE.md → "Theme Availability and
 * Gating" and in docs/architecture/canonical-routes-and-surfaces.md. The
 * gate and these tests MUST be removed together once the Aurora cockpit.css
 * class-context migration lands.
 *
 * Contract under test:
 *   1. AURORA_GATED_THEME_IDS contains obsidian-slate (the current gap).
 *   2. resolveSafeThemeIdForSurface coerces gated ids to the fallback only
 *      when surfaceId === "aurora"; other surfaces keep their id.
 *   3. healGatedThemeForSurface() rewrites store + localStorage when the
 *      active theme is gated and the surface is Aurora.
 *   4. healGatedThemeForSurface() is a no-op for non-Aurora surfaces.
 *   5. healGatedThemeForSurface() is a no-op if the fallback theme id is
 *      somehow not in the themes list (safety rail).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const STORAGE_KEY_ACTIVE = "contenthub:active-theme-id";

describe("themeStore — Aurora theme gate (short-lived hotfix)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("exposes AURORA_GATED_THEME_IDS containing obsidian-slate", async () => {
    const mod = await import("../../stores/themeStore");
    expect(mod.AURORA_GATED_THEME_IDS.has("obsidian-slate")).toBe(true);
    // Fallback must be a registered built-in theme (see themeStore.ts).
    expect(mod.AURORA_FALLBACK_THEME_ID).toBe("midnight-ultraviolet");
  });

  it("resolveSafeThemeIdForSurface coerces gated id on aurora surface", async () => {
    const mod = await import("../../stores/themeStore");
    expect(
      mod.resolveSafeThemeIdForSurface("obsidian-slate", "aurora"),
    ).toBe("midnight-ultraviolet");
  });

  it("resolveSafeThemeIdForSurface passes gated id through on legacy surface", async () => {
    const mod = await import("../../stores/themeStore");
    expect(
      mod.resolveSafeThemeIdForSurface("obsidian-slate", "legacy"),
    ).toBe("obsidian-slate");
    expect(
      mod.resolveSafeThemeIdForSurface("obsidian-slate", null),
    ).toBe("obsidian-slate");
  });

  it("resolveSafeThemeIdForSurface passes non-gated id through on aurora", async () => {
    const mod = await import("../../stores/themeStore");
    expect(
      mod.resolveSafeThemeIdForSurface("midnight-ultraviolet", "aurora"),
    ).toBe("midnight-ultraviolet");
    expect(
      mod.resolveSafeThemeIdForSurface("warm-earth", "aurora"),
    ).toBe("warm-earth");
  });

  it("healGatedThemeForSurface rewrites active theme + localStorage on aurora", async () => {
    localStorage.setItem(STORAGE_KEY_ACTIVE, "obsidian-slate");
    const mod = await import("../../stores/themeStore");
    const store = mod.useThemeStore.getState();
    expect(store.activeThemeId).toBe("obsidian-slate");

    store.healGatedThemeForSurface("aurora");

    const healed = mod.useThemeStore.getState();
    expect(healed.activeThemeId).toBe("midnight-ultraviolet");
    expect(localStorage.getItem(STORAGE_KEY_ACTIVE)).toBe("midnight-ultraviolet");
  });

  it("healGatedThemeForSurface is a no-op on non-aurora surface", async () => {
    localStorage.setItem(STORAGE_KEY_ACTIVE, "obsidian-slate");
    const mod = await import("../../stores/themeStore");
    const store = mod.useThemeStore.getState();

    store.healGatedThemeForSurface("legacy");

    const after = mod.useThemeStore.getState();
    expect(after.activeThemeId).toBe("obsidian-slate");
    expect(localStorage.getItem(STORAGE_KEY_ACTIVE)).toBe("obsidian-slate");
  });

  it("healGatedThemeForSurface is a no-op when active theme is not gated", async () => {
    localStorage.setItem(STORAGE_KEY_ACTIVE, "midnight-ultraviolet");
    const mod = await import("../../stores/themeStore");
    const store = mod.useThemeStore.getState();

    store.healGatedThemeForSurface("aurora");

    const after = mod.useThemeStore.getState();
    expect(after.activeThemeId).toBe("midnight-ultraviolet");
    expect(localStorage.getItem(STORAGE_KEY_ACTIVE)).toBe("midnight-ultraviolet");
  });

  it("healGatedThemeForSurface bails out if fallback is missing from themes list", async () => {
    localStorage.setItem(STORAGE_KEY_ACTIVE, "obsidian-slate");
    const mod = await import("../../stores/themeStore");
    // Simulate a pathological state where the fallback theme is missing
    // (shouldn't happen in production — built-ins are undeletable — but the
    // guard must still refuse to strand the user on an unknown id).
    mod.useThemeStore.setState({
      themes: mod.useThemeStore
        .getState()
        .themes.filter((t) => t.id !== mod.AURORA_FALLBACK_THEME_ID),
    });

    mod.useThemeStore.getState().healGatedThemeForSurface("aurora");

    const after = mod.useThemeStore.getState();
    // Theme id stays unchanged when fallback isn't available.
    expect(after.activeThemeId).toBe("obsidian-slate");
  });
});
