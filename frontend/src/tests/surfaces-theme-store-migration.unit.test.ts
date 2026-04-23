/**
 * themeStore surface migration tests — Faz 1.
 *
 * Loading semantics we want to verify:
 *
 *   1. No payload             → activeSurfaceId is null
 *   2. v1 payload { v:1, id }  → activeSurfaceId reflects id
 *   3. v1 payload { v:1, id:null } → activeSurfaceId is null
 *   4. Corrupt JSON           → activeSurfaceId is null, slot is cleared
 *   5. Missing version field  → treated as v0 and migrated (null or string)
 *   6. Future version number  → ignored, activeSurfaceId is null
 *   7. setActiveSurface writes a proper v1 envelope
 *
 * We reset the vitest module graph between cases because themeStore reads
 * localStorage at module load.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const STORAGE_KEY_ACTIVE = "contenthub:active-theme-id";
const STORAGE_KEY_SURFACE = "contenthub:active-surface-id";

describe("themeStore — Surface Registry migration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("activeSurfaceId is null when nothing is stored", async () => {
    const mod = await import("../stores/themeStore");
    expect(mod.useThemeStore.getState().activeSurfaceId).toBeNull();
  });

  it("reads a valid v1 payload", async () => {
    localStorage.setItem(
      STORAGE_KEY_SURFACE,
      JSON.stringify({ v: 1, id: "horizon" }),
    );
    const mod = await import("../stores/themeStore");
    expect(mod.useThemeStore.getState().activeSurfaceId).toBe("horizon");
  });

  it("v1 payload with null id results in null", async () => {
    localStorage.setItem(STORAGE_KEY_SURFACE, JSON.stringify({ v: 1, id: null }));
    const mod = await import("../stores/themeStore");
    expect(mod.useThemeStore.getState().activeSurfaceId).toBeNull();
  });

  it("corrupt JSON is cleared and treated as null", async () => {
    localStorage.setItem(STORAGE_KEY_SURFACE, "{{{not-json}}}");
    const mod = await import("../stores/themeStore");
    expect(mod.useThemeStore.getState().activeSurfaceId).toBeNull();
    // Corrupt slot should have been cleared.
    expect(localStorage.getItem(STORAGE_KEY_SURFACE)).toBeNull();
  });

  it("legacy v0 bare-string payload is ignored as unknown shape", async () => {
    // localStorage can only hold strings, so "horizon" (bare) is stored as
    // the literal characters 'h', 'o', ... . JSON.parse will throw because
    // it is not valid JSON. Our loader catches the throw and clears the slot.
    localStorage.setItem(STORAGE_KEY_SURFACE, "horizon");
    const mod = await import("../stores/themeStore");
    expect(mod.useThemeStore.getState().activeSurfaceId).toBeNull();
  });

  it("future version payload is ignored (conservative downgrade)", async () => {
    localStorage.setItem(STORAGE_KEY_SURFACE, JSON.stringify({ v: 99, id: "some-future-surface" }));
    const mod = await import("../stores/themeStore");
    expect(mod.useThemeStore.getState().activeSurfaceId).toBeNull();
  });

  it("old themeStore state (layoutMode=horizon on theme, no surface slot) still loads null surface", async () => {
    // Simulate a user that is on the horizon layout via theme but has never
    // touched the surface selector. We don't write to the surface slot.
    localStorage.setItem(STORAGE_KEY_ACTIVE, "horizon-indigo");
    const mod = await import("../stores/themeStore");
    const state = mod.useThemeStore.getState();
    // Surface preference is null → resolver will use legacy path.
    expect(state.activeSurfaceId).toBeNull();
  });

  it("setActiveSurface writes a v1 envelope", async () => {
    const mod = await import("../stores/themeStore");
    mod.useThemeStore.getState().setActiveSurface("horizon");
    const raw = localStorage.getItem(STORAGE_KEY_SURFACE);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed).toEqual({ v: 1, id: "horizon" });
    expect(mod.useThemeStore.getState().activeSurfaceId).toBe("horizon");
  });

  it("setActiveSurface(null) writes a v1 envelope with null id", async () => {
    const mod = await import("../stores/themeStore");
    mod.useThemeStore.getState().setActiveSurface("aurora");
    mod.useThemeStore.getState().setActiveSurface(null);
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_SURFACE) as string);
    expect(parsed).toEqual({ v: 1, id: null });
    expect(mod.useThemeStore.getState().activeSurfaceId).toBeNull();
  });

  it("setActiveSurface does not overwrite activeThemeId", async () => {
    localStorage.setItem(STORAGE_KEY_ACTIVE, "obsidian-slate");
    const mod = await import("../stores/themeStore");
    const before = mod.useThemeStore.getState().activeThemeId;
    mod.useThemeStore.getState().setActiveSurface("horizon");
    const after = mod.useThemeStore.getState().activeThemeId;
    expect(after).toBe(before);
  });
});
