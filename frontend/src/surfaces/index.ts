/**
 * Surface Registry — Public Barrel
 *
 * Faz 1 — Infrastructure only. Import from this barrel from application code.
 * Tests reach into individual files (registry, resolveActiveSurface) directly.
 */

export type {
  SurfaceId,
  KnownSurfaceId,
  SurfaceScope,
  SurfaceStatus,
  SurfaceCoverage,
  SurfaceDensity,
  SurfaceManifest,
  Surface,
  SurfaceLayoutProps,
  SurfaceLayoutComponent,
  SurfaceNavigationProfile,
  SurfaceTokenOverrides,
  SurfacePageKey,
  SurfacePageOverrideMap,
  SurfaceResolutionReason,
  ResolvedSurface,
  SurfaceResolutionInput,
} from "./contract";

export {
  registerSurface,
  getSurface,
  isSurfaceRegisteredAndEnabled,
  listSurfaces,
  listAvailableSurfaces,
  getLegacySurface,
} from "./registry";

export { resolveActiveSurface } from "./resolveActiveSurface";

export {
  SurfaceProvider,
  useSurfaceContext,
  useActiveSurface,
  useSurfaceEnabled,
  useSurfacePageOverride,
} from "./SurfaceContext";

export type { SurfaceTelemetryEvent } from "./telemetry";
export { setSurfaceTelemetrySink, emitSurfaceEvent, emitResolution } from "./telemetry";

// Trigger side-effect registration of built-in surfaces.
import "./manifests/register";
