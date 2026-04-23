/**
 * Built-in surface registration smoke test — Aurora-only runtime.
 *
 * Verifies that importing `surfaces` registers the three built-in surfaces
 * with the expected statuses and scopes, and that each has the expected
 * layout bindings. The atrium/bridge/canvas surfaces were removed in the
 * Aurora-only cleanup wave; this test intentionally asserts that they are
 * NOT registered to catch regressions that resurrect them.
 */

import { describe, it, expect } from "vitest";
import { getSurface, listSurfaces } from "../surfaces";

describe("surfaces — built-in registration", () => {
  it("registers the 3 built-in surfaces (legacy, horizon, aurora)", () => {
    const ids = listSurfaces().map((s) => s.manifest.id).sort();
    // The registry may also contain leftovers from other tests that imported
    // the module. We assert the 3 we care about exist as a subset.
    const builtins = ["aurora", "horizon", "legacy"];
    for (const id of builtins) {
      expect(ids).toContain(id);
    }
  });

  it("legacy is stable and has both layouts (safety-net)", () => {
    const legacy = getSurface("legacy");
    expect(legacy).toBeDefined();
    expect(legacy?.manifest.status).toBe("stable");
    expect(legacy?.manifest.scope).toBe("both");
    expect(typeof legacy?.adminLayout).toBe("function");
    expect(typeof legacy?.userLayout).toBe("function");
    // Safety-net surfaces do not declare page overrides.
    expect(legacy?.pageOverrides).toBeUndefined();
  });

  it("horizon is stable and has both layouts (safety-net)", () => {
    const horizon = getSurface("horizon");
    expect(horizon).toBeDefined();
    expect(horizon?.manifest.status).toBe("stable");
    expect(horizon?.manifest.scope).toBe("both");
    expect(typeof horizon?.adminLayout).toBe("function");
    expect(typeof horizon?.userLayout).toBe("function");
    // Safety-net surfaces do not declare page overrides.
    expect(horizon?.pageOverrides).toBeUndefined();
  });

  it("aurora is the production surface with BOTH layouts + admin/user overrides", () => {
    const aurora = getSurface("aurora");
    expect(aurora).toBeDefined();
    expect(aurora?.manifest.id).toBe("aurora");
    expect(aurora?.manifest.scope).toBe("both");
    expect(typeof aurora?.adminLayout).toBe("function");
    expect(typeof aurora?.userLayout).toBe("function");
    expect(aurora?.pageOverrides).toBeDefined();
    const keys = Object.keys(aurora!.pageOverrides ?? {});
    // Aurora is the production surface: both shells carry many overrides.
    expect(keys.some((k) => k.startsWith("admin."))).toBe(true);
    expect(keys.some((k) => k.startsWith("user."))).toBe(true);
  });

  it("atrium/bridge/canvas are NOT registered (removed in Aurora-only cleanup wave)", () => {
    expect(getSurface("atrium")).toBeUndefined();
    expect(getSurface("bridge")).toBeUndefined();
    expect(getSurface("canvas")).toBeUndefined();
  });
});
