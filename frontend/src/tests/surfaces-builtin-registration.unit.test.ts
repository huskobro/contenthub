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

  it("atrium is beta with BOTH layouts (Faz 5) + editorial user overrides", () => {
    // Faz 5: Atrium artık "both"-scope. Kendi bağımsız editorial shell'ini
    // hem admin hem user paneli için sunar. Page overrides hâlâ sadece
    // user.* (admin tarafında override yok; admin routes legacy fallback).
    const atrium = getSurface("atrium");
    expect(atrium).toBeDefined();
    expect(atrium?.manifest.status).toBe("beta");
    expect(atrium?.manifest.scope).toBe("both");
    expect(typeof atrium?.userLayout).toBe("function");
    expect(typeof atrium?.adminLayout).toBe("function");
    expect(atrium?.pageOverrides).toBeDefined();
    expect(typeof atrium?.pageOverrides?.["user.dashboard"]).toBe("function");
    expect(typeof atrium?.pageOverrides?.["user.projects.list"]).toBe(
      "function",
    );
    expect(typeof atrium?.pageOverrides?.["user.projects.detail"]).toBe(
      "function",
    );
  });

  it("bridge is beta with BOTH layouts (Faz 5) + admin ops page overrides", () => {
    // Faz 5: Bridge artık "both"-scope. Kendi bağımsız 3-kolonlu ops
    // shell'ini hem admin hem user paneli için sunar. Page overrides hâlâ
    // sadece admin.* (user tarafında override yok; user routes legacy
    // fallback'a düşer).
    const bridge = getSurface("bridge");
    expect(bridge).toBeDefined();
    expect(bridge?.manifest.status).toBe("beta");
    expect(bridge?.manifest.scope).toBe("both");
    expect(typeof bridge?.adminLayout).toBe("function");
    expect(typeof bridge?.userLayout).toBe("function");
    expect(bridge?.pageOverrides).toBeDefined();
    expect(typeof bridge?.pageOverrides?.["admin.jobs.registry"]).toBe("function");
    expect(typeof bridge?.pageOverrides?.["admin.jobs.detail"]).toBe("function");
    expect(typeof bridge?.pageOverrides?.["admin.publish.center"]).toBe("function");
  });

  it("canvas is beta with BOTH layouts (Faz 5) + workspace user overrides", () => {
    // Faz 5: Canvas artık "both"-scope. Kendi bağımsız workspace shell'ini
    // hem admin (zone-gruplu sidebar) hem user (project-centric sidebar)
    // paneli için sunar. Page overrides hâlâ sadece user.* (admin tarafı
    // için override yok; admin routes legacy fallback'a düşer).
    // Faz 3A (flow completion) + Faz 3B (workspace completion) toplamda 9
    // user.* override barındırır.
    const canvas = getSurface("canvas");
    expect(canvas).toBeDefined();
    expect(canvas?.manifest.status).toBe("beta");
    expect(canvas?.manifest.scope).toBe("both");
    expect(typeof canvas?.userLayout).toBe("function");
    expect(typeof canvas?.adminLayout).toBe("function");
    expect(canvas?.pageOverrides).toBeDefined();
    // Faz 3 core
    expect(typeof canvas?.pageOverrides?.["user.dashboard"]).toBe("function");
    expect(typeof canvas?.pageOverrides?.["user.projects.list"]).toBe("function");
    expect(typeof canvas?.pageOverrides?.["user.projects.detail"]).toBe("function");
    // Faz 3A flow completion
    expect(typeof canvas?.pageOverrides?.["user.publish"]).toBe("function");
    expect(typeof canvas?.pageOverrides?.["user.channels.list"]).toBe("function");
    expect(typeof canvas?.pageOverrides?.["user.connections.list"]).toBe(
      "function",
    );
    expect(typeof canvas?.pageOverrides?.["user.analytics.overview"]).toBe(
      "function",
    );
    // Faz 3B workspace completion
    expect(typeof canvas?.pageOverrides?.["user.calendar"]).toBe("function");
    expect(typeof canvas?.pageOverrides?.["user.channels.detail"]).toBe(
      "function",
    );
  });
});
