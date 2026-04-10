/**
 * Surface page override unit tests — Faz 2.
 *
 * These tests verify the Bridge-era "page override" extension of the surface
 * contract. They cover:
 *
 *   1. `pageOverrides` is an accepted Surface field and round-trips through
 *      registry register/get without losing its entries.
 *   2. The bridge manifest (loaded via the real `surfaces` barrel) registers
 *      the three expected admin page overrides:
 *        - admin.jobs.registry
 *        - admin.jobs.detail
 *        - admin.publish.center
 *   3. The bridge surface is admin-scope only — its user-scope behavior still
 *      falls back to legacy, so there is no way for a user-panel caller to
 *      pick up a bridge override by accident.
 *   4. Legacy + Horizon do NOT declare page overrides (Faz 1 contract is
 *      shell-swap only).
 *   5. Unknown page keys return `undefined` — the public hook will treat that
 *      as "no override, render legacy".
 *
 * The resolver tests in `surfaces-resolver.unit.test.ts` still own the active-
 * surface selection logic. This file is scoped to the override-map shape and
 * registry contract.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetSurfaceRegistry,
  registerSurface,
  getSurface,
} from "../surfaces/registry";
import type { Surface, SurfacePageOverrideMap } from "../surfaces/contract";

function makeSurface(
  id: string,
  status: Surface["manifest"]["status"],
  scope: Surface["manifest"]["scope"],
  pageOverrides?: SurfacePageOverrideMap,
): Surface {
  const DummyLayout = () => null;
  return {
    manifest: {
      id,
      name: id,
      tagline: "",
      description: "",
      author: "test",
      version: "0.0.0",
      scope,
      status,
      coverage: "full",
    },
    adminLayout: status !== "disabled" && (scope === "admin" || scope === "both") ? DummyLayout : undefined,
    userLayout: status !== "disabled" && (scope === "user" || scope === "both") ? DummyLayout : undefined,
    pageOverrides,
  };
}

describe("Surface pageOverrides — contract roundtrip", () => {
  beforeEach(() => {
    __resetSurfaceRegistry();
  });

  it("registers a surface with pageOverrides and reads it back intact", () => {
    const JobsReg = () => null;
    const JobsDet = () => null;
    registerSurface(
      makeSurface("test-bridge", "beta", "admin", {
        "admin.jobs.registry": JobsReg,
        "admin.jobs.detail": JobsDet,
      }),
    );
    const out = getSurface("test-bridge");
    expect(out).toBeDefined();
    expect(out!.pageOverrides).toBeDefined();
    expect(out!.pageOverrides!["admin.jobs.registry"]).toBe(JobsReg);
    expect(out!.pageOverrides!["admin.jobs.detail"]).toBe(JobsDet);
  });

  it("treats pageOverrides as optional — legacy/horizon pattern still works", () => {
    registerSurface(makeSurface("test-legacy", "stable", "both"));
    const out = getSurface("test-legacy");
    expect(out).toBeDefined();
    expect(out!.pageOverrides).toBeUndefined();
  });

  it("returns undefined for unknown page keys without throwing", () => {
    const Page = () => null;
    registerSurface(
      makeSurface("test-bridge", "beta", "admin", {
        "admin.jobs.registry": Page,
      }),
    );
    const out = getSurface("test-bridge");
    // `SurfacePageKey` is a branded string union so an untyped lookup is ok.
    const missing = out!.pageOverrides!["admin.publish.center"];
    expect(missing).toBeUndefined();
  });

  it("scope=admin surface never leaks pageOverrides into user-panel resolution", () => {
    // The resolver handles scope mismatch by ignoring the surface entirely, so
    // from the override map's perspective the test is: an admin-scope surface
    // may carry admin.* keys, and a user-panel consumer will never be handed
    // this surface in the first place. We assert at the shape level here.
    const Page = () => null;
    registerSurface(
      makeSurface("test-bridge", "beta", "admin", {
        "admin.jobs.registry": Page,
      }),
    );
    const out = getSurface("test-bridge")!;
    expect(out.manifest.scope).toBe("admin");
    expect(Object.keys(out.pageOverrides ?? {})).toEqual(["admin.jobs.registry"]);
    // No user.* keys smuggled in:
    expect(
      Object.keys(out.pageOverrides ?? {}).some((k) => k.startsWith("user.")),
    ).toBe(false);
  });
});

describe("Built-in bridge surface registration — Faz 2", () => {
  beforeEach(async () => {
    // The built-in registrar registers ALL surfaces (legacy/horizon/atrium/
    // bridge/canvas). We reset first to make sure we see a clean slate, then
    // re-import the bootstrap module to get deterministic registration.
    __resetSurfaceRegistry();
    const mod = await import("../surfaces/manifests/register");
    mod.registerBuiltinSurfaces();
  });

  it("registers bridge with admin scope and beta status", () => {
    const bridge = getSurface("bridge");
    expect(bridge).toBeDefined();
    expect(bridge!.manifest.id).toBe("bridge");
    expect(bridge!.manifest.scope).toBe("admin");
    expect(bridge!.manifest.status).toBe("beta");
  });

  it("bridge provides an adminLayout forwarder (no userLayout)", () => {
    const bridge = getSurface("bridge")!;
    expect(typeof bridge.adminLayout).toBe("function");
    expect(bridge.userLayout).toBeUndefined();
  });

  it("bridge declares the three Faz 2 page overrides", () => {
    const bridge = getSurface("bridge")!;
    expect(bridge.pageOverrides).toBeDefined();
    expect(typeof bridge.pageOverrides!["admin.jobs.registry"]).toBe("function");
    expect(typeof bridge.pageOverrides!["admin.jobs.detail"]).toBe("function");
    expect(typeof bridge.pageOverrides!["admin.publish.center"]).toBe("function");
  });

  it("bridge does NOT override unrelated pages (explicit contract)", () => {
    const bridge = getSurface("bridge")!;
    const overrides = bridge.pageOverrides ?? {};
    const keys = Object.keys(overrides);
    // Exactly three overrides — no accidental surface-wide takeover.
    expect(keys.length).toBe(3);
    expect(keys.sort()).toEqual([
      "admin.jobs.detail",
      "admin.jobs.registry",
      "admin.publish.center",
    ]);
  });

  it("legacy and horizon do NOT declare pageOverrides", () => {
    const legacy = getSurface("legacy")!;
    const horizon = getSurface("horizon")!;
    expect(legacy.pageOverrides).toBeUndefined();
    expect(horizon.pageOverrides).toBeUndefined();
  });
});
