/**
 * Atrium user surface — Faz 4 unit tests.
 *
 * Verifies the Atrium surface registration after promotion from a disabled
 * placeholder (Faz 1) to a real beta user-scope premium surface (Faz 4).
 * Atrium must:
 *
 *   1. Register as a beta user-scope surface (not "both", not admin).
 *   2. Expose a userLayout forwarder and NO adminLayout.
 *   3. Declare exactly the three Faz 4 page overrides (user.dashboard,
 *      user.projects.list, user.projects.detail) — no more, no less.
 *   4. Never leak admin.* keys into its override map.
 *   5. Carry the editorial navigation profile declared in the manifest.
 *   6. Co-exist with canvas (both are user-scope) without override collision.
 *
 * These tests mirror canvas-user-surface.unit.test.ts so any regression in
 * the registration shape is caught immediately.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetSurfaceRegistry,
  getSurface,
  listSurfaces,
} from "../surfaces/registry";

describe("Atrium surface — Faz 4 registration", () => {
  beforeEach(async () => {
    // Start from a clean registry and re-run the built-in bootstrap so we
    // see exactly what the production code would see.
    __resetSurfaceRegistry();
    const mod = await import("../surfaces/manifests/register");
    mod.registerBuiltinSurfaces();
  });

  it("registers atrium as a beta user-scope surface", () => {
    const atrium = getSurface("atrium");
    expect(atrium).toBeDefined();
    expect(atrium!.manifest.id).toBe("atrium");
    expect(atrium!.manifest.status).toBe("beta");
    expect(atrium!.manifest.scope).toBe("user");
    // Atrium must not be "both" — we must not accidentally mount Atrium in
    // the admin panel. Atrium is a user-only editorial/premium shell.
    expect(atrium!.manifest.scope).not.toBe("both");
    expect(atrium!.manifest.scope).not.toBe("admin");
  });

  it("atrium provides a userLayout forwarder and NO adminLayout", () => {
    const atrium = getSurface("atrium")!;
    expect(typeof atrium.userLayout).toBe("function");
    expect(atrium.adminLayout).toBeUndefined();
  });

  it("atrium declares exactly the Faz 4 premium page overrides", () => {
    const atrium = getSurface("atrium")!;
    expect(atrium.pageOverrides).toBeDefined();
    // Faz 4 — editorial premium prototype: dashboard, projects list, project
    // detail. Intentionally scoped to three pages so the first visibly-new
    // atrium pass stays reviewable and never blocks legacy/canvas fallbacks
    // on un-overridden routes.
    expect(typeof atrium.pageOverrides!["user.dashboard"]).toBe("function");
    expect(typeof atrium.pageOverrides!["user.projects.list"]).toBe("function");
    expect(typeof atrium.pageOverrides!["user.projects.detail"]).toBe(
      "function",
    );
  });

  it("atrium does NOT override any other user.* pages (explicit contract)", () => {
    const atrium = getSurface("atrium")!;
    const overrides = atrium.pageOverrides ?? {};
    const keys = Object.keys(overrides).sort();
    // Exactly three overrides in Faz 4. Atrium intentionally stays focused
    // on the showcase/portfolio/detail trio so un-overridden routes keep
    // falling through to legacy (or to canvas if canvas is active).
    expect(keys).toEqual([
      "user.dashboard",
      "user.projects.detail",
      "user.projects.list",
    ]);
  });

  it("atrium does NOT leak admin.* keys into its override map", () => {
    const atrium = getSurface("atrium")!;
    const keys = Object.keys(atrium.pageOverrides ?? {});
    expect(keys.some((k) => k.startsWith("admin."))).toBe(false);
  });

  it("atrium manifest carries the editorial top-nav navigation profile", () => {
    const atrium = getSurface("atrium")!;
    expect(atrium.manifest.navigation).toBeDefined();
    // Atrium's visible difference from canvas: horizontal top-nav, not a
    // sidebar. This is a product-visible contract — do not silently flip
    // atrium to a sidebar shell.
    expect(atrium.manifest.navigation!.primary).toBe("top-nav");
    expect(atrium.manifest.navigation!.secondary).toBe("editorial-strip");
    // Command palette is owned by shared infra, not the atrium shell.
    expect(atrium.manifest.navigation!.ownsCommandPalette).toBe(false);
  });

  it("atrium manifest carries premium/editorial tone tokens", () => {
    const atrium = getSurface("atrium")!;
    // Tone is how atrium differentiates itself in Surface Picker previews —
    // lock the headline descriptors so we don't drift into "workspace" tone.
    const tone = atrium.manifest.tone ?? [];
    expect(tone).toContain("premium");
    expect(tone).toContain("editorial");
  });

  it("canvas (user) and atrium (user) co-exist without override collision", () => {
    const all = listSurfaces();
    const canvas = all.find((s) => s.manifest.id === "canvas");
    const atrium = all.find((s) => s.manifest.id === "atrium");
    expect(canvas).toBeDefined();
    expect(atrium).toBeDefined();
    expect(canvas!.manifest.scope).toBe("user");
    expect(atrium!.manifest.scope).toBe("user");
    // Two user-scope surfaces may share override keys — that's WHY the
    // resolver exists (pick one via `ui.surface.default.user`). The test is:
    // both declare `user.dashboard`, `user.projects.list`, `user.projects.detail`
    // as functions. The resolver, not the registry, picks a winner.
    const canvasKeys = new Set(Object.keys(canvas!.pageOverrides ?? {}));
    const atriumKeys = new Set(Object.keys(atrium!.pageOverrides ?? {}));
    for (const k of atriumKeys) {
      expect(canvasKeys.has(k)).toBe(true);
    }
    // Atrium is strictly a SUBSET of canvas's overrides in Faz 4 — canvas
    // owns 9 keys, atrium owns 3. If this ever flips, revisit the resolver
    // contract.
    expect(atriumKeys.size).toBeLessThan(canvasKeys.size);
  });

  it("bridge (admin) is not affected by atrium promotion", () => {
    // Sanity: Faz 4 must not accidentally touch bridge/canvas shape. We only
    // check bridge here; canvas co-existence is asserted above.
    const bridge = getSurface("bridge")!;
    expect(bridge.manifest.scope).toBe("admin");
    expect(bridge.manifest.status).toBe("beta");
    const bridgeKeys = new Set(Object.keys(bridge.pageOverrides ?? {}));
    // Bridge must still only own admin.* keys.
    for (const k of bridgeKeys) {
      expect(k.startsWith("admin.")).toBe(true);
    }
  });

  it("legacy and horizon still do NOT declare pageOverrides after atrium promotion", () => {
    // Sanity: Faz 4 must not accidentally touch legacy/horizon shape.
    const legacy = getSurface("legacy")!;
    const horizon = getSurface("horizon")!;
    expect(legacy.pageOverrides).toBeUndefined();
    expect(horizon.pageOverrides).toBeUndefined();
  });
});
