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

import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { ResolvedSurface, SurfaceId, SurfacePageKey } from "./contract";
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

// ---------------------------------------------------------------------------
// Page override hook — Faz 2
// ---------------------------------------------------------------------------

/**
 * Page override hook — router-agnostic page swap mechanism.
 *
 * Faz 2 introduces this to let surfaces (Bridge first) replace individual
 * admin pages WITHOUT touching router.tsx. Usage inside a legacy page:
 *
 *     export function JobsRegistryPage() {
 *       const Override = useSurfacePageOverride("admin.jobs.registry");
 *       if (Override) return <Override />;
 *       return <LegacyJobsRegistryPage />;
 *     }
 *
 * Rules:
 * - Only resolves overrides when the kill switch is on.
 * - Only admin-scope surfaces can provide admin page overrides.
 * - Scope is inferred from the page key prefix ("admin." or "user.").
 * - Returns null when no override exists → caller falls back to legacy.
 * - Returns null if `useSurfaceContext` is unavailable (tests / bootstrap),
 *   so the hook is safe to call from any page.
 *
 * The hook is intentionally NOT wrapped in `useMemo`: the override component
 * reference comes straight from the (stable) registry, so React's referential
 * equality already prevents unnecessary re-renders.
 */
export function useSurfacePageOverride(
  key: SurfacePageKey,
): ComponentType | null {
  // Best-effort read: during unit tests or legacy code paths the provider may
  // not exist. In that case we silently return null (→ legacy renders).
  const ctx = useContext(SurfaceContext);
  if (!ctx) return null;
  if (!ctx.infrastructureEnabled) return null;

  const scope: "admin" | "user" = key.startsWith("user.") ? "user" : "admin";
  const resolved = scope === "admin" ? ctx.admin : ctx.user;

  const overrides = resolved.surface.pageOverrides;
  if (!overrides) return null;

  const Component = overrides[key];
  return Component ?? null;
}
