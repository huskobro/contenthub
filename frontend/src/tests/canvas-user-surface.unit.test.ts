/**
 * Canvas user surface — Faz 3 unit tests.
 *
 * Verifies the Canvas surface registration after promotion from a disabled
 * placeholder. Canvas must:
 *
 *   1. Register as a beta "both"-scope surface (Faz 5 — Canvas artık hem
 *      admin hem user paneli için kendi bağımsız shell'ini sunar).
 *   2. Expose BOTH a userLayout AND an adminLayout forwarder.
 *   3. Declare the Faz 3+3A+3B page overrides (user.dashboard,
 *      user.projects.list, user.projects.detail, user.publish,
 *      user.channels.list, user.connections.list, user.analytics.overview,
 *      user.calendar, user.channels.detail) — no more, no less.
 *   4. Never leak admin.* keys into its override map (admin shell için
 *      override yok; admin routes legacy/horizon fallback'a düşer).
 *   5. Carry the navigation profile declared in the manifest.
 *
 * These tests mirror the bridge Faz 2 checks so any regression in the
 * registration shape is caught immediately.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetSurfaceRegistry,
  getSurface,
  listSurfaces,
} from "../surfaces/registry";

describe("Canvas surface — Faz 3 registration", () => {
  beforeEach(async () => {
    // Start from a clean registry and re-run the built-in bootstrap so we
    // see exactly what the production code would see.
    __resetSurfaceRegistry();
    const mod = await import("../surfaces/manifests/register");
    mod.registerBuiltinSurfaces();
  });

  it("registers canvas as a beta 'both'-scope surface (Faz 5)", () => {
    const canvas = getSurface("canvas");
    expect(canvas).toBeDefined();
    expect(canvas!.manifest.id).toBe("canvas");
    expect(canvas!.manifest.status).toBe("beta");
    // Faz 5: Canvas artık hem admin hem user panel için kendi bağımsız
    // shell'ini sunar.
    expect(canvas!.manifest.scope).toBe("both");
  });

  it("canvas provides BOTH a userLayout and an adminLayout forwarder (Faz 5)", () => {
    const canvas = getSurface("canvas")!;
    expect(typeof canvas.userLayout).toBe("function");
    expect(typeof canvas.adminLayout).toBe("function");
  });

  it("canvas declares the Faz 3 core page overrides", () => {
    const canvas = getSurface("canvas")!;
    expect(canvas.pageOverrides).toBeDefined();
    // Faz 3 — project core
    expect(typeof canvas.pageOverrides!["user.dashboard"]).toBe("function");
    expect(typeof canvas.pageOverrides!["user.projects.list"]).toBe("function");
    expect(typeof canvas.pageOverrides!["user.projects.detail"]).toBe("function");
  });

  it("canvas declares the Faz 3A flow-completion overrides", () => {
    const canvas = getSurface("canvas")!;
    // Faz 3A — distribution + analytics surfaces
    expect(typeof canvas.pageOverrides!["user.publish"]).toBe("function");
    expect(typeof canvas.pageOverrides!["user.channels.list"]).toBe("function");
    expect(typeof canvas.pageOverrides!["user.connections.list"]).toBe(
      "function",
    );
    expect(typeof canvas.pageOverrides!["user.analytics.overview"]).toBe(
      "function",
    );
  });

  it("canvas declares the Faz 3B workspace-completion overrides", () => {
    const canvas = getSurface("canvas")!;
    // Faz 3B — workspace completion: calendar + channel detail studio
    expect(typeof canvas.pageOverrides!["user.calendar"]).toBe("function");
    expect(typeof canvas.pageOverrides!["user.channels.detail"]).toBe(
      "function",
    );
  });

  it("canvas does NOT override unrelated pages (explicit contract)", () => {
    const canvas = getSurface("canvas")!;
    const overrides = canvas.pageOverrides ?? {};
    const keys = Object.keys(overrides).sort();
    // Exactly nine overrides after Faz 3B — three core + four flow-completion
    // + two workspace-completion. Still intentionally scoped: user-wide
    // takeover is NOT a goal.
    expect(keys).toEqual([
      "user.analytics.overview",
      "user.calendar",
      "user.channels.detail",
      "user.channels.list",
      "user.connections.list",
      "user.dashboard",
      "user.projects.detail",
      "user.projects.list",
      "user.publish",
    ]);
  });

  it("canvas does NOT leak admin.* keys into its override map", () => {
    const canvas = getSurface("canvas")!;
    const keys = Object.keys(canvas.pageOverrides ?? {});
    expect(keys.some((k) => k.startsWith("admin."))).toBe(false);
  });

  it("canvas manifest carries the workspace navigation profile", () => {
    const canvas = getSurface("canvas")!;
    expect(canvas.manifest.navigation).toBeDefined();
    expect(canvas.manifest.navigation!.primary).toBe("sidebar");
    expect(canvas.manifest.navigation!.secondary).toBe("workspace-header");
    // Command palette is owned by shared infra, not the canvas shell.
    expect(canvas.manifest.navigation!.ownsCommandPalette).toBe(false);
  });

  it("bridge and canvas co-exist with both=scope without override collision (Faz 5)", () => {
    const all = listSurfaces();
    const bridge = all.find((s) => s.manifest.id === "bridge");
    const canvas = all.find((s) => s.manifest.id === "canvas");
    expect(bridge).toBeDefined();
    expect(canvas).toBeDefined();
    // Faz 5: her ikisi de "both"-scope. Bridge admin.* override'ları sunar,
    // Canvas user.* override'ları — ayrı namespace'lerde yaşadıkları için
    // çakışma yoktur.
    expect(bridge!.manifest.scope).toBe("both");
    expect(canvas!.manifest.scope).toBe("both");
    const bridgeKeys = new Set(Object.keys(bridge!.pageOverrides ?? {}));
    const canvasKeys = new Set(Object.keys(canvas!.pageOverrides ?? {}));
    for (const k of canvasKeys) {
      expect(bridgeKeys.has(k)).toBe(false);
    }
  });

  it("legacy and horizon still do NOT declare pageOverrides after canvas promotion", () => {
    // Sanity: Faz 3 must not accidentally touch legacy/horizon shape.
    const legacy = getSurface("legacy")!;
    const horizon = getSurface("horizon")!;
    expect(legacy.pageOverrides).toBeUndefined();
    expect(horizon.pageOverrides).toBeUndefined();
  });
});
