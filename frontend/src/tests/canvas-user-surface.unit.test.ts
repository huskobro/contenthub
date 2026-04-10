/**
 * Canvas user surface — Faz 3 unit tests.
 *
 * Verifies the Canvas surface registration after promotion from a disabled
 * placeholder. Canvas must:
 *
 *   1. Register as a beta user-scope surface (not "both", not admin).
 *   2. Expose a userLayout forwarder and NO adminLayout.
 *   3. Declare exactly the three Faz 3 page overrides (user.dashboard,
 *      user.projects.list, user.projects.detail) — no more, no less.
 *   4. Never leak admin.* keys into its override map.
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

  it("registers canvas as a beta user-scope surface", () => {
    const canvas = getSurface("canvas");
    expect(canvas).toBeDefined();
    expect(canvas!.manifest.id).toBe("canvas");
    expect(canvas!.manifest.status).toBe("beta");
    expect(canvas!.manifest.scope).toBe("user");
    // Canvas should NOT be "both" — we must not accidentally mount Canvas in
    // the admin panel.
    expect(canvas!.manifest.scope).not.toBe("both");
    expect(canvas!.manifest.scope).not.toBe("admin");
  });

  it("canvas provides a userLayout forwarder and NO adminLayout", () => {
    const canvas = getSurface("canvas")!;
    expect(typeof canvas.userLayout).toBe("function");
    expect(canvas.adminLayout).toBeUndefined();
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

  it("bridge (admin) and canvas (user) co-exist without scope collision", () => {
    const all = listSurfaces();
    const bridge = all.find((s) => s.manifest.id === "bridge");
    const canvas = all.find((s) => s.manifest.id === "canvas");
    expect(bridge).toBeDefined();
    expect(canvas).toBeDefined();
    expect(bridge!.manifest.scope).toBe("admin");
    expect(canvas!.manifest.scope).toBe("user");
    // Their page override maps must not share any keys — bridge owns admin.*,
    // canvas owns user.*.
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
