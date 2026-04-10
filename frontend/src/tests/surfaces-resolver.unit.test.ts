/**
 * Surface Resolver unit tests — Faz 1.
 *
 * Covers the 4-layer resolution pipeline and all invariants.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetSurfaceRegistry,
  registerSurface,
} from "../surfaces/registry";
import { resolveActiveSurface } from "../surfaces/resolveActiveSurface";
import type { Surface, SurfaceResolutionInput } from "../surfaces/contract";

function makeSurface(
  id: string,
  status: Surface["manifest"]["status"],
  scope: Surface["manifest"]["scope"],
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
  };
}

function makeInput(overrides: Partial<SurfaceResolutionInput> = {}): SurfaceResolutionInput {
  return {
    scope: "admin",
    infrastructureEnabled: true,
    forcedSurfaceId: null,
    userSurfaceId: null,
    roleDefaultId: null,
    globalDefaultId: null,
    enabledSurfaceIds: new Set(["legacy", "horizon"]),
    legacyLayoutMode: "classic",
    ...overrides,
  };
}

describe("resolveActiveSurface", () => {
  beforeEach(() => {
    __resetSurfaceRegistry();
    registerSurface(makeSurface("legacy", "stable", "both"));
    registerSurface(makeSurface("horizon", "stable", "both"));
  });

  describe("kill switch OFF", () => {
    it("returns legacy when layoutMode is classic", () => {
      const out = resolveActiveSurface(makeInput({ infrastructureEnabled: false, legacyLayoutMode: "classic" }));
      expect(out.surface.manifest.id).toBe("legacy");
      expect(out.reason).toBe("kill-switch-off");
    });

    it("returns horizon when layoutMode is horizon", () => {
      const out = resolveActiveSurface(makeInput({ infrastructureEnabled: false, legacyLayoutMode: "horizon" }));
      expect(out.surface.manifest.id).toBe("horizon");
      expect(out.reason).toBe("kill-switch-off");
    });

    it("ignores user preference when kill switch is OFF", () => {
      // Even if the user has atrium selected, legacy path wins when switch is off.
      registerSurface(makeSurface("atrium", "stable", "both"));
      const out = resolveActiveSurface(
        makeInput({
          infrastructureEnabled: false,
          legacyLayoutMode: "classic",
          userSurfaceId: "atrium",
          enabledSurfaceIds: new Set(["legacy", "horizon", "atrium"]),
        }),
      );
      expect(out.surface.manifest.id).toBe("legacy");
    });
  });

  describe("layer 1: feature-flag-forced", () => {
    it("uses forcedSurfaceId when set and usable", () => {
      registerSurface(makeSurface("atrium", "stable", "both"));
      const out = resolveActiveSurface(
        makeInput({
          forcedSurfaceId: "atrium",
          enabledSurfaceIds: new Set(["legacy", "horizon", "atrium"]),
        }),
      );
      expect(out.surface.manifest.id).toBe("atrium");
      expect(out.reason).toBe("feature-flag-forced");
    });

    it("falls through when forced surface is disabled", () => {
      registerSurface(makeSurface("atrium", "disabled", "both"));
      const out = resolveActiveSurface(makeInput({ forcedSurfaceId: "atrium" }));
      expect(out.surface.manifest.id).toBe("legacy");
      expect(out.reason).toBe("legacy-fallback");
    });

    it("falls through when forced surface does not exist", () => {
      const out = resolveActiveSurface(makeInput({ forcedSurfaceId: "ghost" }));
      expect(out.surface.manifest.id).toBe("legacy");
      expect(out.reason).toBe("legacy-fallback");
    });
  });

  describe("layer 2: user preference", () => {
    it("uses userSurfaceId when registered + enabled + in-scope", () => {
      registerSurface(makeSurface("bridge", "stable", "both"));
      const out = resolveActiveSurface(
        makeInput({
          userSurfaceId: "bridge",
          enabledSurfaceIds: new Set(["legacy", "horizon", "bridge"]),
        }),
      );
      expect(out.surface.manifest.id).toBe("bridge");
      expect(out.reason).toBe("user-preference");
    });

    it("falls through on scope mismatch", () => {
      registerSurface(makeSurface("only-user", "stable", "user"));
      const out = resolveActiveSurface(
        makeInput({
          scope: "admin",
          userSurfaceId: "only-user",
          enabledSurfaceIds: new Set(["legacy", "horizon", "only-user"]),
        }),
      );
      expect(out.surface.manifest.id).toBe("legacy");
      expect(out.reason).toBe("legacy-fallback");
    });

    it("falls through when surface is disabled", () => {
      registerSurface(makeSurface("atrium", "disabled", "both"));
      const out = resolveActiveSurface(makeInput({ userSurfaceId: "atrium" }));
      expect(out.surface.manifest.id).toBe("legacy");
    });

    it("falls through when surface is not in enabledSurfaceIds", () => {
      registerSurface(makeSurface("atrium", "stable", "both"));
      const out = resolveActiveSurface(
        makeInput({
          userSurfaceId: "atrium",
          enabledSurfaceIds: new Set(["legacy", "horizon"]), // atrium not enabled
        }),
      );
      expect(out.surface.manifest.id).toBe("legacy");
    });
  });

  describe("layer 3: role default", () => {
    it("uses roleDefaultId when no user preference", () => {
      const out = resolveActiveSurface(makeInput({ roleDefaultId: "horizon" }));
      expect(out.surface.manifest.id).toBe("horizon");
      expect(out.reason).toBe("role-default");
    });

    it("role default is only consulted when user preference fails", () => {
      registerSurface(makeSurface("bridge", "stable", "both"));
      const out = resolveActiveSurface(
        makeInput({
          userSurfaceId: "bridge",
          roleDefaultId: "horizon",
          enabledSurfaceIds: new Set(["legacy", "horizon", "bridge"]),
        }),
      );
      expect(out.surface.manifest.id).toBe("bridge");
      expect(out.reason).toBe("user-preference");
    });
  });

  describe("layer 4: global default", () => {
    it("uses globalDefaultId when no user/role preference", () => {
      const out = resolveActiveSurface(makeInput({ globalDefaultId: "horizon" }));
      expect(out.surface.manifest.id).toBe("horizon");
      expect(out.reason).toBe("global-default");
    });
  });

  describe("ultimate fallback", () => {
    it("returns legacy when every layer fails", () => {
      const out = resolveActiveSurface(makeInput());
      expect(out.surface.manifest.id).toBe("legacy");
      expect(out.reason).toBe("legacy-fallback");
    });

    it("always succeeds even with a garbage-only input", () => {
      const out = resolveActiveSurface(
        makeInput({
          forcedSurfaceId: "ghost1",
          userSurfaceId: "ghost2",
          roleDefaultId: "ghost3",
          globalDefaultId: "ghost4",
        }),
      );
      expect(out.surface.manifest.id).toBe("legacy");
      expect(out.reason).toBe("legacy-fallback");
      expect(out.didFallback).toBe(true);
    });
  });
});
