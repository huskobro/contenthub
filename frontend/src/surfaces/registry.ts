/**
 * Surface Registry — Singleton
 *
 * Faz 1 — Infrastructure only.
 *
 * Holds all registered surfaces in memory. The registry is intentionally
 * simple (a Map + a few guards) so it can be inspected in tests and reset
 * between test runs via `__resetSurfaceRegistry()`.
 *
 * Design decisions:
 * - Single module-level Map keyed by surface id.
 * - `registerSurface` is idempotent for a given id: re-registering overwrites
 *   the entry. This lets tests replace a manifest without a full reset and
 *   lets HMR reload manifest modules without exploding.
 * - `getLegacySurface` is a dedicated helper because legacy is the ultimate
 *   fallback: it must always be resolvable even if the caller did not seed
 *   the registry explicitly.
 * - There is no auto-registration from this module. Call sites must import
 *   the manifests they need (see `surfaces/manifests/register.ts`).
 */

import type { Surface, SurfaceId, SurfaceScope } from "./contract";

const registry = new Map<SurfaceId, Surface>();

/**
 * Register (or replace) a surface in the global registry.
 *
 * Validation rules:
 * - id must be a non-empty string
 * - if scope is "admin" or "both", adminLayout must exist OR status must be "disabled"
 * - if scope is "user"  or "both", userLayout  must exist OR status must be "disabled"
 *
 * Violations throw in dev, warn in prod.
 */
export function registerSurface(surface: Surface): void {
  const { manifest, adminLayout, userLayout } = surface;

  if (!manifest || typeof manifest.id !== "string" || manifest.id.length === 0) {
    throw new Error("registerSurface: manifest.id must be a non-empty string");
  }

  if (manifest.status !== "disabled") {
    if (
      (manifest.scope === "admin" || manifest.scope === "both") &&
      typeof adminLayout !== "function"
    ) {
      throw new Error(
        `registerSurface: surface "${manifest.id}" declares scope "${manifest.scope}" ` +
          `but does not provide an adminLayout component.`,
      );
    }
    if (
      (manifest.scope === "user" || manifest.scope === "both") &&
      typeof userLayout !== "function"
    ) {
      throw new Error(
        `registerSurface: surface "${manifest.id}" declares scope "${manifest.scope}" ` +
          `but does not provide a userLayout component.`,
      );
    }
  }

  registry.set(manifest.id, surface);
}

/** Look up a surface by id. Returns undefined if not registered. */
export function getSurface(id: SurfaceId): Surface | undefined {
  return registry.get(id);
}

/** Return true if a surface is registered AND not disabled. */
export function isSurfaceRegisteredAndEnabled(id: SurfaceId): boolean {
  const surface = registry.get(id);
  if (!surface) return false;
  return surface.manifest.status !== "disabled";
}

/** Return all registered surfaces (including disabled placeholders). */
export function listSurfaces(): Surface[] {
  return Array.from(registry.values());
}

/**
 * Return all registered surfaces that are:
 * - not "disabled"
 * - compatible with the given scope
 * - not hidden
 */
export function listAvailableSurfaces(scope: SurfaceScope): Surface[] {
  return listSurfaces().filter((s) => {
    if (s.manifest.status === "disabled") return false;
    if (s.manifest.hidden) return false;
    if (scope === "admin") {
      return s.manifest.scope === "admin" || s.manifest.scope === "both";
    }
    if (scope === "user") {
      return s.manifest.scope === "user" || s.manifest.scope === "both";
    }
    return true;
  });
}

/**
 * Fetch the legacy surface. Throws if legacy is missing, because legacy is
 * the ultimate fallback — its absence is a bootstrap bug we should fail-fast
 * on.
 */
export function getLegacySurface(): Surface {
  const legacy = registry.get("legacy");
  if (!legacy) {
    throw new Error(
      "Surface registry: 'legacy' surface is not registered. Did you import 'surfaces/manifests/register'?",
    );
  }
  return legacy;
}

/**
 * Test / HMR helper. Clears the entire registry. Not exported from the public
 * index barrel — use via direct import in tests only.
 */
export function __resetSurfaceRegistry(): void {
  registry.clear();
}

/**
 * Test helper: return the raw internal Map size. Used by unit tests.
 */
export function __surfaceRegistrySize(): number {
  return registry.size;
}
