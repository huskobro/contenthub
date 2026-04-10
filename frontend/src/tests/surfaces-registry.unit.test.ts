/**
 * Surface Registry unit tests — Faz 1.
 *
 * Covers:
 *  - registerSurface idempotency
 *  - validation (missing layouts for enabled scopes throws)
 *  - getSurface / getLegacySurface / listAvailableSurfaces filters
 *  - isSurfaceRegisteredAndEnabled
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerSurface,
  getSurface,
  getLegacySurface,
  listSurfaces,
  listAvailableSurfaces,
  isSurfaceRegisteredAndEnabled,
  __resetSurfaceRegistry,
  __surfaceRegistrySize,
} from "../surfaces/registry";
import type { Surface } from "../surfaces/contract";

function makeSurface(
  id: string,
  status: Surface["manifest"]["status"],
  scope: Surface["manifest"]["scope"],
  withLayouts = true,
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
    adminLayout: withLayouts && (scope === "admin" || scope === "both") ? DummyLayout : undefined,
    userLayout: withLayouts && (scope === "user" || scope === "both") ? DummyLayout : undefined,
  };
}

describe("surfaces/registry", () => {
  beforeEach(() => {
    __resetSurfaceRegistry();
  });

  it("registers and retrieves a surface", () => {
    const s = makeSurface("legacy", "stable", "both");
    registerSurface(s);
    expect(__surfaceRegistrySize()).toBe(1);
    expect(getSurface("legacy")).toBe(s);
  });

  it("registerSurface is idempotent (overwrites)", () => {
    const a = makeSurface("legacy", "stable", "both");
    const b = makeSurface("legacy", "stable", "both");
    registerSurface(a);
    registerSurface(b);
    expect(__surfaceRegistrySize()).toBe(1);
    expect(getSurface("legacy")).toBe(b);
  });

  it("throws if manifest.id is missing", () => {
    const bad = {
      manifest: { id: "", name: "", tagline: "", description: "", author: "", version: "", scope: "both", status: "stable", coverage: "full" },
    } as unknown as Surface;
    expect(() => registerSurface(bad)).toThrow(/manifest\.id/);
  });

  it("throws if an enabled admin-scoped surface has no adminLayout", () => {
    const bad = makeSurface("broken", "stable", "admin", false);
    expect(() => registerSurface(bad)).toThrow(/adminLayout/);
  });

  it("throws if an enabled user-scoped surface has no userLayout", () => {
    const bad = makeSurface("broken", "stable", "user", false);
    expect(() => registerSurface(bad)).toThrow(/userLayout/);
  });

  it("allows disabled surfaces to omit layouts", () => {
    const placeholder = makeSurface("atrium", "disabled", "both", false);
    expect(() => registerSurface(placeholder)).not.toThrow();
    expect(getSurface("atrium")).toBe(placeholder);
  });

  it("isSurfaceRegisteredAndEnabled returns false for disabled", () => {
    registerSurface(makeSurface("legacy", "stable", "both"));
    registerSurface(makeSurface("atrium", "disabled", "both", false));
    expect(isSurfaceRegisteredAndEnabled("legacy")).toBe(true);
    expect(isSurfaceRegisteredAndEnabled("atrium")).toBe(false);
    expect(isSurfaceRegisteredAndEnabled("ghost")).toBe(false);
  });

  it("listSurfaces returns all registered surfaces including disabled", () => {
    registerSurface(makeSurface("legacy", "stable", "both"));
    registerSurface(makeSurface("horizon", "stable", "both"));
    registerSurface(makeSurface("atrium", "disabled", "both", false));
    expect(listSurfaces()).toHaveLength(3);
  });

  it("listAvailableSurfaces filters out disabled, hidden, and scope mismatch", () => {
    registerSurface(makeSurface("legacy", "stable", "both"));
    registerSurface(makeSurface("horizon", "stable", "both"));
    registerSurface(makeSurface("admin-only", "stable", "admin"));
    registerSurface(makeSurface("user-only", "stable", "user"));
    registerSurface(makeSurface("atrium", "disabled", "both", false));

    const adminAvail = listAvailableSurfaces("admin");
    expect(adminAvail.map((s) => s.manifest.id).sort()).toEqual([
      "admin-only",
      "horizon",
      "legacy",
    ]);
    const userAvail = listAvailableSurfaces("user");
    expect(userAvail.map((s) => s.manifest.id).sort()).toEqual([
      "horizon",
      "legacy",
      "user-only",
    ]);
  });

  it("getLegacySurface throws when legacy is not registered", () => {
    expect(() => getLegacySurface()).toThrow(/legacy/);
  });

  it("getLegacySurface returns the registered legacy surface", () => {
    const legacy = makeSurface("legacy", "stable", "both");
    registerSurface(legacy);
    expect(getLegacySurface()).toBe(legacy);
  });
});
