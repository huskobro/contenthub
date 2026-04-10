/**
 * resolveActiveSurface — pure function
 *
 * Faz 1 — Infrastructure only.
 *
 * Implements the 4-layer resolution pipeline:
 *
 *   1. feature-flag-forced → if forcedSurfaceId is set and usable, use it
 *   2. user-preference     → themeStore.activeSurfaceId
 *   3. role-default        → settings: ui.surface.default.admin | .user
 *   4. global-default      → settings: ui.surface.default (future) / legacy
 *
 * Every step is guarded by these invariants (checked in order):
 *
 *   a. Kill switch off  → short-circuit via legacy/horizon (legacyLayoutMode)
 *   b. Candidate must be registered
 *   c. Candidate must be enabled (status != "disabled")
 *   d. Candidate must be in `enabledSurfaceIds` (admin settings gate)
 *   e. Candidate scope must include the current scope
 *
 * ANY failure → move to the next layer.
 * ALL layers fail → legacy surface with reason "legacy-fallback".
 *
 * This function is intentionally pure: it takes a registry accessor as a
 * parameter so tests can inject a stub registry.
 */

import type {
  ResolvedSurface,
  Surface,
  SurfaceId,
  SurfaceResolutionInput,
  SurfaceResolutionReason,
} from "./contract";
import { getLegacySurface, getSurface } from "./registry";

type RegistryAccessor = (id: SurfaceId) => Surface | undefined;

interface Options {
  /** Registry lookup. Defaults to the global registry. */
  lookup?: RegistryAccessor;
}

/**
 * Check whether a candidate surface can be used for the given scope.
 */
function candidateIsUsable(
  surface: Surface | undefined,
  scope: "admin" | "user",
  enabledIds: ReadonlySet<SurfaceId>,
): { ok: boolean; reason?: SurfaceResolutionReason } {
  if (!surface) return { ok: false, reason: "missing-fallback" };
  if (surface.manifest.status === "disabled") {
    return { ok: false, reason: "disabled-fallback" };
  }
  // Admin settings gate: surface must be in the enabled set, UNLESS it is
  // legacy/horizon which are always allowed (bootstrap surfaces).
  const alwaysOn = surface.manifest.id === "legacy" || surface.manifest.id === "horizon";
  if (!alwaysOn && !enabledIds.has(surface.manifest.id)) {
    return { ok: false, reason: "disabled-fallback" };
  }
  const s = surface.manifest.scope;
  if (scope === "admin" && s !== "admin" && s !== "both") {
    return { ok: false, reason: "scope-mismatch-fallback" };
  }
  if (scope === "user" && s !== "user" && s !== "both") {
    return { ok: false, reason: "scope-mismatch-fallback" };
  }
  return { ok: true };
}

function pickLegacy(
  scope: "admin" | "user",
  requestedId: SurfaceId | null,
  reason: SurfaceResolutionReason,
  lookup: RegistryAccessor,
): ResolvedSurface {
  // Try registry first, then the dedicated accessor.
  const fromLookup = lookup("legacy");
  const legacy = fromLookup ?? getLegacySurface();
  // didFallback is true only when the caller asked for a specific surface
  // other than legacy. A null request (kill-switch, no preference) is not
  // a fallback in the telemetry sense.
  const didFallback = requestedId !== null && requestedId !== "legacy";
  return {
    surface: legacy,
    reason,
    requestedId,
    scope,
    didFallback,
  };
}

/**
 * Main entry point.
 */
export function resolveActiveSurface(
  input: SurfaceResolutionInput,
  options: Options = {},
): ResolvedSurface {
  const lookup: RegistryAccessor = options.lookup ?? ((id) => getSurface(id));

  // ---- Invariant 1: kill switch ------------------------------------------
  if (!input.infrastructureEnabled) {
    // Legacy path: use the old layoutMode hint (themeStore).
    const layoutMode = input.legacyLayoutMode ?? "classic";
    if (layoutMode === "horizon") {
      const horizon = lookup("horizon");
      const usable = candidateIsUsable(horizon, input.scope, input.enabledSurfaceIds);
      if (horizon && usable.ok) {
        return {
          surface: horizon,
          reason: "kill-switch-off",
          requestedId: "horizon",
          scope: input.scope,
          didFallback: false,
        };
      }
    }
    return pickLegacy(input.scope, null, "kill-switch-off", lookup);
  }

  // ---- Layer 1: feature-flag-forced --------------------------------------
  if (input.forcedSurfaceId) {
    const s = lookup(input.forcedSurfaceId);
    const check = candidateIsUsable(s, input.scope, input.enabledSurfaceIds);
    if (s && check.ok) {
      return {
        surface: s,
        reason: "feature-flag-forced",
        requestedId: input.forcedSurfaceId,
        scope: input.scope,
        didFallback: false,
      };
    }
    // Forced surface is broken — fall through.
  }

  // ---- Layer 2: user preference ------------------------------------------
  if (input.userSurfaceId) {
    const s = lookup(input.userSurfaceId);
    const check = candidateIsUsable(s, input.scope, input.enabledSurfaceIds);
    if (s && check.ok) {
      return {
        surface: s,
        reason: "user-preference",
        requestedId: input.userSurfaceId,
        scope: input.scope,
        didFallback: false,
      };
    }
    // User preference broken — fall through, but remember the request id so
    // telemetry can log the mismatch.
  }

  // ---- Layer 3: role default ---------------------------------------------
  if (input.roleDefaultId) {
    const s = lookup(input.roleDefaultId);
    const check = candidateIsUsable(s, input.scope, input.enabledSurfaceIds);
    if (s && check.ok) {
      return {
        surface: s,
        reason: "role-default",
        requestedId: input.userSurfaceId ?? input.roleDefaultId,
        scope: input.scope,
        didFallback: input.userSurfaceId !== null && input.userSurfaceId !== s.manifest.id,
      };
    }
  }

  // ---- Layer 4: global default -------------------------------------------
  if (input.globalDefaultId) {
    const s = lookup(input.globalDefaultId);
    const check = candidateIsUsable(s, input.scope, input.enabledSurfaceIds);
    if (s && check.ok) {
      return {
        surface: s,
        reason: "global-default",
        requestedId: input.userSurfaceId ?? input.globalDefaultId,
        scope: input.scope,
        didFallback: input.userSurfaceId !== null && input.userSurfaceId !== s.manifest.id,
      };
    }
  }

  // ---- Ultimate fallback: legacy -----------------------------------------
  return pickLegacy(
    input.scope,
    input.userSurfaceId ?? input.forcedSurfaceId ?? input.roleDefaultId ?? input.globalDefaultId ?? null,
    "legacy-fallback",
    lookup,
  );
}
