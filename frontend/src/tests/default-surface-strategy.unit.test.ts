/**
 * Default surface strategy — Faz 4B unit tests.
 *
 * Backs up the product decision we locked in KNOWN_SETTINGS:
 *
 *   - admin role-default = "bridge"   (Operations Command Center, beta, admin-scope)
 *   - user  role-default = "canvas"   (Creator Workspace Pro, beta, user-scope)
 *   - atrium stays opt-in premium (NOT a role-default; only reachable via
 *     explicit user-preference or an admin-set override)
 *   - legacy + horizon stay as fallback / classic mod
 *
 * These tests go through `resolveActiveSurface` directly with controlled
 * inputs so we can verify:
 *
 *   1. Fresh user (no activeSurfaceId) + gates open → admin resolves to
 *      bridge, user resolves to canvas with reason="role-default"
 *   2. Fresh user (no activeSurfaceId) + gates CLOSED (the "builtin_default"
 *      config on a never-activated system) → both scopes resolve to legacy
 *      with reason="legacy-fallback" — defaults are dormant but safe
 *   3. Explicit user preference ("atrium" for user scope) is NOT overridden
 *      by the role-default change — the user still sees atrium with
 *      reason="user-preference"
 *   4. Explicit user preference ("horizon") is NOT overridden on admin scope
 *      — horizon is always-on bootstrap, user-preference wins over role-default
 *   5. Kill switch OFF → resolver short-circuits to legacy regardless of
 *      role-default ("kill-switch-off") and does NOT touch explicit tercihleri
 *   6. Admin picks a disabled surface as role-default → resolver falls
 *      through to legacy (role-default is ignored when gate fails)
 *   7. Scope mismatch on role-default (admin role-default="canvas") → resolver
 *      falls through to legacy (never renders user-only surface in admin)
 *   8. Atrium as an admin role-default still fails (user-only) → legacy
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetSurfaceRegistry,
} from "../surfaces/registry";
import { resolveActiveSurface } from "../surfaces/resolveActiveSurface";
import type { SurfaceId } from "../surfaces/contract";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bootRegistry() {
  __resetSurfaceRegistry();
  const mod = await import("../surfaces/manifests/register");
  mod.registerBuiltinSurfaces();
}

function enabledAll(): ReadonlySet<SurfaceId> {
  return new Set<SurfaceId>([
    "legacy",
    "horizon",
    "atrium",
    "bridge",
    "canvas",
  ]);
}

function enabledBootstrapOnly(): ReadonlySet<SurfaceId> {
  return new Set<SurfaceId>(["legacy", "horizon"]);
}

// The KNOWN_SETTINGS product-default values we lock in with this phase.
const PRODUCT_DEFAULT_ADMIN: SurfaceId = "bridge";
const PRODUCT_DEFAULT_USER: SurfaceId = "canvas";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Default surface strategy — Faz 4B", () => {
  // NOT: Paralel vitest worker baskisinda `await import("../surfaces/manifests/register")`
  // ilk collect turunda ~10-15s surebilir (vite transform sira iceriyor). Tek dosya
  // kosusunda beforeEach < 1s. 60s timeout baski kosullarinda bile deterministik
  // yesil — testin kendi ici saniyelerce surmez, sadece hook altyapisi bekler.
  beforeEach(async () => {
    await bootRegistry();
  }, 60000);

  // -------------------------------------------------------------------------
  // 1. Fresh user + gates open → admin=bridge, user=canvas (role-default)
  // -------------------------------------------------------------------------

  it("fresh admin (no explicit preference) with gates open → resolves to bridge via role-default", () => {
    const result = resolveActiveSurface({
      scope: "admin",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: null,
      roleDefaultId: PRODUCT_DEFAULT_ADMIN,
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("bridge");
    expect(result.reason).toBe("role-default");
    expect(result.didFallback).toBe(false);
  });

  it("fresh user (no explicit preference) with gates open → resolves to canvas via role-default", () => {
    const result = resolveActiveSurface({
      scope: "user",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: null,
      roleDefaultId: PRODUCT_DEFAULT_USER,
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("canvas");
    expect(result.reason).toBe("role-default");
    expect(result.didFallback).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 2. Fresh user + gates CLOSED (never-activated builtin_default scenario)
  // -------------------------------------------------------------------------

  it("fresh admin + gates closed → defaults are dormant, legacy fallback", () => {
    const result = resolveActiveSurface({
      scope: "admin",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: null,
      roleDefaultId: PRODUCT_DEFAULT_ADMIN,
      globalDefaultId: null,
      enabledSurfaceIds: enabledBootstrapOnly(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("legacy");
    expect(result.reason).toBe("legacy-fallback");
  });

  it("fresh user + gates closed → defaults are dormant, legacy fallback", () => {
    const result = resolveActiveSurface({
      scope: "user",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: null,
      roleDefaultId: PRODUCT_DEFAULT_USER,
      globalDefaultId: null,
      enabledSurfaceIds: enabledBootstrapOnly(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("legacy");
    expect(result.reason).toBe("legacy-fallback");
  });

  // -------------------------------------------------------------------------
  // 3. Explicit user preference survives the role-default change
  // -------------------------------------------------------------------------

  it("explicit user preference (atrium) is NOT overridden by canvas role-default", () => {
    const result = resolveActiveSurface({
      scope: "user",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: "atrium", // user picked atrium explicitly
      roleDefaultId: PRODUCT_DEFAULT_USER, // admin set default=canvas
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("atrium");
    expect(result.reason).toBe("user-preference");
  });

  it("explicit user preference (horizon) is NOT overridden by bridge role-default on admin", () => {
    const result = resolveActiveSurface({
      scope: "admin",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: "horizon", // admin picked horizon explicitly
      roleDefaultId: PRODUCT_DEFAULT_ADMIN, // role-default=bridge
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("horizon");
    expect(result.reason).toBe("user-preference");
  });

  it("explicit user preference (legacy) survives on either panel", () => {
    for (const scope of ["admin", "user"] as const) {
      const result = resolveActiveSurface({
        scope,
        infrastructureEnabled: true,
        forcedSurfaceId: null,
        userSurfaceId: "legacy",
        roleDefaultId: scope === "admin" ? PRODUCT_DEFAULT_ADMIN : PRODUCT_DEFAULT_USER,
        globalDefaultId: null,
        enabledSurfaceIds: enabledAll(),
        legacyLayoutMode: "classic",
      });
      expect(result.surface.manifest.id).toBe("legacy");
      expect(result.reason).toBe("user-preference");
    }
  });

  // -------------------------------------------------------------------------
  // 4. Kill switch still wins over everything
  // -------------------------------------------------------------------------

  it("kill switch OFF → role-default ignored, resolver short-circuits to legacy", () => {
    for (const scope of ["admin", "user"] as const) {
      const result = resolveActiveSurface({
        scope,
        infrastructureEnabled: false, // kill switch off
        forcedSurfaceId: null,
        userSurfaceId: null,
        roleDefaultId: scope === "admin" ? PRODUCT_DEFAULT_ADMIN : PRODUCT_DEFAULT_USER,
        globalDefaultId: null,
        enabledSurfaceIds: enabledAll(),
        legacyLayoutMode: "classic",
      });
      expect(result.surface.manifest.id).toBe("legacy");
      expect(result.reason).toBe("kill-switch-off");
    }
  });

  it("kill switch OFF with explicit user preference → still legacy (classic legacyLayoutMode)", () => {
    const result = resolveActiveSurface({
      scope: "user",
      infrastructureEnabled: false,
      forcedSurfaceId: null,
      userSurfaceId: "canvas", // explicit preference is ignored while kill switch is off
      roleDefaultId: PRODUCT_DEFAULT_USER,
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("legacy");
    expect(result.reason).toBe("kill-switch-off");
  });

  // -------------------------------------------------------------------------
  // 5. Role-default that points at a disabled surface / scope mismatch
  // -------------------------------------------------------------------------

  // Faz 5: Canvas, Atrium, Bridge artık "both"-scope. Daha önce "admin
  // role-default=canvas" veya "user role-default=bridge" gibi konfigürasyonlar
  // scope-mismatch üreterek legacy'ye düşürüyordu; artık her üç surface de
  // hem admin hem user paneli için kendi bağımsız shell'ini sunduğu için bu
  // tercihler DOĞRUDAN başarılı role-default resolve'una dönüşür.
  it("admin role-default=canvas (Faz 5: both-scope) → canvas resolves with role-default", () => {
    const result = resolveActiveSurface({
      scope: "admin",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: null,
      roleDefaultId: "canvas",
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("canvas");
    expect(result.reason).toBe("role-default");
  });

  it("user role-default=bridge (Faz 5: both-scope) → bridge resolves with role-default", () => {
    const result = resolveActiveSurface({
      scope: "user",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: null,
      roleDefaultId: "bridge",
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("bridge");
    expect(result.reason).toBe("role-default");
  });

  it("admin role-default=atrium (Faz 5: both-scope) → atrium resolves with role-default", () => {
    const result = resolveActiveSurface({
      scope: "admin",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: null,
      roleDefaultId: "atrium",
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("atrium");
    expect(result.reason).toBe("role-default");
  });

  it("role-default pointing at a never-registered surface id → legacy fallback", () => {
    const result = resolveActiveSurface({
      scope: "admin",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: null,
      roleDefaultId: "ghost-surface-from-the-future",
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(result.surface.manifest.id).toBe("legacy");
    expect(result.reason).toBe("legacy-fallback");
  });

  // -------------------------------------------------------------------------
  // 6. Atrium's role — opt-in premium, reachable only via explicit preference
  // -------------------------------------------------------------------------

  it("atrium is NOT a role-default but reachable via explicit user preference", () => {
    const viaPreference = resolveActiveSurface({
      scope: "user",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: "atrium",
      roleDefaultId: PRODUCT_DEFAULT_USER, // still canvas
      globalDefaultId: null,
      enabledSurfaceIds: enabledAll(),
      legacyLayoutMode: "classic",
    });
    expect(viaPreference.surface.manifest.id).toBe("atrium");
    expect(viaPreference.reason).toBe("user-preference");
  });

  it("atrium unreachable when its enabled gate is off even with explicit preference", () => {
    const result = resolveActiveSurface({
      scope: "user",
      infrastructureEnabled: true,
      forcedSurfaceId: null,
      userSurfaceId: "atrium",
      roleDefaultId: PRODUCT_DEFAULT_USER,
      globalDefaultId: null,
      // atrium intentionally NOT in the enabled set
      enabledSurfaceIds: new Set<SurfaceId>([
        "legacy",
        "horizon",
        "bridge",
        "canvas",
      ]),
      legacyLayoutMode: "classic",
    });
    // Layer 2 (user preference) fails gate → layer 3 kicks in → canvas.
    expect(result.surface.manifest.id).toBe("canvas");
    expect(result.reason).toBe("role-default");
    expect(result.didFallback).toBe(true);
  });
});
