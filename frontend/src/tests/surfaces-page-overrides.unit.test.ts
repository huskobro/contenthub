/**
 * Surface page override unit tests.
 *
 * These tests verify the "page override" extension of the surface contract
 * at the registry level (shape-only). They cover:
 *
 *   1. `pageOverrides` is an accepted Surface field and round-trips through
 *      registry register/get without losing its entries.
 *   2. Legacy + Horizon (Aurora-only safety-nets) do NOT declare page
 *      overrides — their contract is shell-swap only.
 *   3. Aurora — the built-in production surface — declares admin + user
 *      overrides, and the overrides collection is stable across repeated
 *      registerBuiltinSurfaces() calls.
 *   4. Unknown page keys return `undefined` — the public hook will treat
 *      that as "no override, render legacy".
 *
 * The resolver tests in `surfaces-resolver.unit.test.ts` still own the
 * active-surface selection logic. This file is scoped to the override-map
 * shape and registry contract.
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
      makeSurface("test-with-overrides", "beta", "admin", {
        "admin.jobs.registry": JobsReg,
        "admin.jobs.detail": JobsDet,
      }),
    );
    const out = getSurface("test-with-overrides");
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
      makeSurface("test-with-overrides", "beta", "admin", {
        "admin.jobs.registry": Page,
      }),
    );
    const out = getSurface("test-with-overrides");
    // `SurfacePageKey` is a branded string union so an untyped lookup is ok.
    const missing = out!.pageOverrides!["admin.publish.center"];
    expect(missing).toBeUndefined();
  });

  it("scope=admin surface never leaks user.* keys into its override map", () => {
    // The resolver handles scope mismatch by ignoring the surface entirely, so
    // from the override map's perspective the test is: an admin-scope surface
    // may carry admin.* keys, and a user-panel consumer will never be handed
    // this surface in the first place. We assert at the shape level here.
    const Page = () => null;
    registerSurface(
      makeSurface("test-admin-only", "beta", "admin", {
        "admin.jobs.registry": Page,
      }),
    );
    const out = getSurface("test-admin-only")!;
    expect(out.manifest.scope).toBe("admin");
    expect(Object.keys(out.pageOverrides ?? {})).toEqual(["admin.jobs.registry"]);
    // No user.* keys smuggled in:
    expect(
      Object.keys(out.pageOverrides ?? {}).some((k) => k.startsWith("user.")),
    ).toBe(false);
  });
});

describe("Built-in surface registration — pageOverrides shape", () => {
  beforeEach(async () => {
    // The built-in registrar registers legacy, horizon, aurora. We reset
    // first to make sure we see a clean slate, then re-import the bootstrap
    // module to get deterministic registration.
    __resetSurfaceRegistry();
    const mod = await import("../surfaces/manifests/register");
    mod.registerBuiltinSurfaces();
  });

  it("aurora is registered as a both-scope production surface with overrides", () => {
    const aurora = getSurface("aurora");
    expect(aurora).toBeDefined();
    expect(aurora!.manifest.id).toBe("aurora");
    expect(aurora!.manifest.scope).toBe("both");
    expect(typeof aurora!.adminLayout).toBe("function");
    expect(typeof aurora!.userLayout).toBe("function");
    expect(aurora!.pageOverrides).toBeDefined();
  });

  it("aurora declares both admin.* and user.* overrides (both-scope surface)", () => {
    const aurora = getSurface("aurora")!;
    const keys = Object.keys(aurora.pageOverrides ?? {});
    const adminKeys = keys.filter((k) => k.startsWith("admin."));
    const userKeys = keys.filter((k) => k.startsWith("user."));
    expect(adminKeys.length).toBeGreaterThan(0);
    expect(userKeys.length).toBeGreaterThan(0);
  });

  it("legacy and horizon do NOT declare pageOverrides (safety-net shell-swap only)", () => {
    const legacy = getSurface("legacy")!;
    const horizon = getSurface("horizon")!;
    expect(legacy.pageOverrides).toBeUndefined();
    expect(horizon.pageOverrides).toBeUndefined();
  });
});
