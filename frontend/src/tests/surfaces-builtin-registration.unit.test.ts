/**
 * Built-in surface registration smoke test — Faz 1.
 *
 * Verifies that importing `surfaces` registers all 5 built-in surfaces with
 * the expected statuses and scopes, and that legacy/horizon have layout
 * bindings while atrium/bridge/canvas do not.
 */

import { describe, it, expect } from "vitest";
import { getSurface, listSurfaces } from "../surfaces";

describe("surfaces — built-in registration", () => {
  it("registers all 5 built-in surfaces", () => {
    const ids = listSurfaces().map((s) => s.manifest.id).sort();
    // The registry may also contain leftovers from other tests that imported
    // the module. We assert the 5 we care about exist as a subset.
    const builtins = ["atrium", "bridge", "canvas", "horizon", "legacy"];
    for (const id of builtins) {
      expect(ids).toContain(id);
    }
  });

  it("legacy is stable and has both layouts", () => {
    const legacy = getSurface("legacy");
    expect(legacy).toBeDefined();
    expect(legacy?.manifest.status).toBe("stable");
    expect(legacy?.manifest.scope).toBe("both");
    expect(typeof legacy?.adminLayout).toBe("function");
    expect(typeof legacy?.userLayout).toBe("function");
  });

  it("horizon is stable and has both layouts", () => {
    const horizon = getSurface("horizon");
    expect(horizon).toBeDefined();
    expect(horizon?.manifest.status).toBe("stable");
    expect(horizon?.manifest.scope).toBe("both");
    expect(typeof horizon?.adminLayout).toBe("function");
    expect(typeof horizon?.userLayout).toBe("function");
  });

  it("atrium is disabled and has no layouts", () => {
    const atrium = getSurface("atrium");
    expect(atrium).toBeDefined();
    expect(atrium?.manifest.status).toBe("disabled");
    expect(atrium?.adminLayout).toBeUndefined();
    expect(atrium?.userLayout).toBeUndefined();
  });

  it("bridge is promoted to beta (Faz 2) with admin-only layout + page overrides", () => {
    // Faz 2 promotes bridge to "beta" with admin scope. It provides:
    //   - an adminLayout forwarder (3-panel ops shell)
    //   - NO userLayout (bridge is admin-only)
    //   - pageOverrides for admin.jobs.registry / admin.jobs.detail /
    //     admin.publish.center
    const bridge = getSurface("bridge");
    expect(bridge).toBeDefined();
    expect(bridge?.manifest.status).toBe("beta");
    expect(bridge?.manifest.scope).toBe("admin");
    expect(typeof bridge?.adminLayout).toBe("function");
    expect(bridge?.userLayout).toBeUndefined();
    expect(bridge?.pageOverrides).toBeDefined();
    expect(typeof bridge?.pageOverrides?.["admin.jobs.registry"]).toBe("function");
    expect(typeof bridge?.pageOverrides?.["admin.jobs.detail"]).toBe("function");
    expect(typeof bridge?.pageOverrides?.["admin.publish.center"]).toBe("function");
  });

  it("canvas is disabled and has no layouts", () => {
    const canvas = getSurface("canvas");
    expect(canvas).toBeDefined();
    expect(canvas?.manifest.status).toBe("disabled");
    expect(canvas?.adminLayout).toBeUndefined();
    expect(canvas?.userLayout).toBeUndefined();
  });
});
