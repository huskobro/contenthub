/**
 * Surface Context — lightweight wrapper around useSurfaceResolution.
 *
 * Faz 1 — Infrastructure only.
 *
 * The heavy lifting (settings fetch, memoization, telemetry) lives in
 * `useSurfaceResolution`. This module exposes a React context so downstream
 * components that do not want to run the hook themselves (e.g. a switcher UI,
 * the dev diagnostic badge) can read the same resolution without duplicating
 * settings fetches.
 *
 * IMPORTANT: the top-level DynamicAdminLayout / DynamicUserLayout call
 * `useSurfaceResolution` DIRECTLY, not through this context, because they run
 * BEFORE the ThemeProvider mounts in the rendered layout tree. This provider
 * exists for consumers inside the layout.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { ResolvedSurface, SurfaceId } from "./contract";
import { listSurfaces } from "./registry";
import {
  useSurfaceResolution,
  type SurfaceSettingsSnapshot,
} from "./useSurfaceResolution";

export interface SurfaceContextValue {
  admin: ResolvedSurface;
  user: ResolvedSurface;
  settings: SurfaceSettingsSnapshot;
  infrastructureEnabled: boolean;
}

const SurfaceContext = createContext<SurfaceContextValue | null>(null);

export function SurfaceProvider({ children }: { children: ReactNode }) {
  const value = useSurfaceResolution();
  return <SurfaceContext.Provider value={value}>{children}</SurfaceContext.Provider>;
}

/**
 * Read the surface context. Throws if used outside of SurfaceProvider.
 */
export function useSurfaceContext(): SurfaceContextValue {
  const ctx = useContext(SurfaceContext);
  if (!ctx) {
    throw new Error("useSurfaceContext must be used inside <SurfaceProvider>");
  }
  return ctx;
}

/**
 * Return the ResolvedSurface for the given panel scope.
 */
export function useActiveSurface(scope: "admin" | "user"): ResolvedSurface {
  const ctx = useSurfaceContext();
  return scope === "admin" ? ctx.admin : ctx.user;
}

/**
 * Return true if the given surface id is registered AND the kill switch is
 * on AND settings allow it for the given scope. Primitive for switcher UIs.
 */
export function useSurfaceEnabled(id: SurfaceId, scope: "admin" | "user"): boolean {
  const ctx = useSurfaceContext();
  if (!ctx.infrastructureEnabled) return false;
  const all = listSurfaces();
  const match = all.find((s) => s.manifest.id === id);
  if (!match) return false;
  if (match.manifest.status === "disabled") return false;
  if (scope === "admin" && match.manifest.scope !== "admin" && match.manifest.scope !== "both") {
    return false;
  }
  if (scope === "user" && match.manifest.scope !== "user" && match.manifest.scope !== "both") {
    return false;
  }
  if (id === "legacy" || id === "horizon") return true;
  if (id === "atrium") return ctx.settings.atriumEnabled;
  if (id === "bridge") return ctx.settings.bridgeEnabled;
  if (id === "canvas") return ctx.settings.canvasEnabled;
  return false;
}
