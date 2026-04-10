/**
 * Surface Registry — Contract
 *
 * Faz 1 — Infrastructure only.
 *
 * A "Surface" is a top-level UI variant (a shell with its own layout structure).
 * The platform ships with multiple surfaces (legacy, horizon, atrium, bridge, canvas),
 * but only enabled surfaces are resolvable at runtime. Disabled surfaces remain
 * registered so the resolver can detect them and fall back to legacy.
 *
 * Core invariants:
 * - Legacy surface is ALWAYS available and is the ultimate fallback.
 * - Horizon surface is enabled by default (it pre-dates the registry and must
 *   keep working identically).
 * - New surfaces (atrium, bridge, canvas) are registered as disabled placeholders
 *   in Faz 1. They have no real shell yet.
 * - If the kill switch `ui.surface.infrastructure.enabled` is false, the resolver
 *   short-circuits to legacy/horizon using the old layoutMode-based path.
 * - Scope mismatch (e.g. admin picked a user-only surface) → legacy fallback.
 * - All errors → legacy fallback with a telemetry event.
 */

import type { ComponentType, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Basic identifiers
// ---------------------------------------------------------------------------

/**
 * Known surface ids in Faz 1. We intentionally keep this as a string union so
 * new surfaces can register themselves without modifying the type surface of
 * the registry callers. The registry itself stores ids as plain strings.
 */
export type KnownSurfaceId =
  | "legacy"
  | "horizon"
  | "atrium"
  | "bridge"
  | "canvas";

export type SurfaceId = KnownSurfaceId | (string & { __surfaceIdBrand?: never });

/**
 * Which panels a surface supports. "both" means the same surface implements
 * admin AND user layouts. "admin" / "user" are single-scope surfaces.
 */
export type SurfaceScope = "admin" | "user" | "both";

/**
 * Lifecycle status of a registered surface.
 * - "stable": production-ready (legacy, horizon)
 * - "beta": usable but marked as experimental
 * - "alpha": usable behind explicit opt-in
 * - "disabled": registered slot, not resolvable (atrium/bridge/canvas in Faz 1)
 */
export type SurfaceStatus = "stable" | "beta" | "alpha" | "disabled";

/**
 * How much of the admin/user pages the surface covers.
 * Faz 1 only cares about "full" (surface takes over the layout shell) — the
 * other levels exist so Faz 2+ can express partial overrides without another
 * contract change.
 */
export type SurfaceCoverage = "full" | "shell-only" | "page-level";

/** UI density hint. Matches ThemeDensity but kept independent for decoupling. */
export type SurfaceDensity = "compact" | "comfortable" | "spacious";

// ---------------------------------------------------------------------------
// Token overrides
// ---------------------------------------------------------------------------

/**
 * Surface-level CSS custom property overrides.
 *
 * Keys MUST be valid `--ch-*` custom properties from themeEngine. The theme
 * engine merges these on top of the active theme vars whenever a surface is
 * active. This lets surfaces tweak spacing / sidebar widths / accent colors
 * without owning the full theme contract.
 */
export type SurfaceTokenOverrides = Record<string, string>;

// ---------------------------------------------------------------------------
// Navigation profile
// ---------------------------------------------------------------------------

/**
 * Navigation hint a surface can declare. Faz 1 does not act on this, but the
 * field exists so a surface can pre-declare its nav shape without another
 * contract migration in Faz 2.
 */
export interface SurfaceNavigationProfile {
  /** e.g. "sidebar", "rail", "topbar", "command-bar" */
  primary?: string;
  /** e.g. "context-panel", "breadcrumb" */
  secondary?: string;
  /** Whether the surface renders its own command palette trigger */
  ownsCommandPalette?: boolean;
}

// ---------------------------------------------------------------------------
// Layout component contract
// ---------------------------------------------------------------------------

/**
 * Props passed to a surface layout component.
 *
 * `children` may be provided by the resolver when the surface is mounted in a
 * slot-based parent (future). Faz 1 keeps this optional because current
 * layouts render `<Outlet />` internally.
 */
export interface SurfaceLayoutProps {
  children?: ReactNode;
}

export type SurfaceLayoutComponent = ComponentType<SurfaceLayoutProps>;

// ---------------------------------------------------------------------------
// Surface manifest
// ---------------------------------------------------------------------------

/**
 * Declarative metadata for a surface. This is the immutable description; the
 * live Surface object (below) adds runtime bindings (components, factories).
 */
export interface SurfaceManifest {
  id: SurfaceId;
  /** Human-readable name shown in admin settings / switchers */
  name: string;
  /** Short tagline used in cards and switcher UI */
  tagline: string;
  /** Long description for admin settings */
  description: string;
  /** Author / owner team */
  author: string;
  /** SemVer */
  version: string;
  /** Which panels this surface covers */
  scope: SurfaceScope;
  /** Lifecycle state */
  status: SurfaceStatus;
  /** Coverage level — Faz 1 only uses "full" */
  coverage: SurfaceCoverage;
  /** Optional density hint */
  density?: SurfaceDensity;
  /** Optional navigation profile hint */
  navigation?: SurfaceNavigationProfile;
  /** Optional tonal tags (e.g. "premium", "operations") */
  tone?: string[];
  /**
   * If true, this surface should not be advertised in switcher UIs even when
   * enabled (reserved for legacy / internal surfaces).
   */
  hidden?: boolean;
}

// ---------------------------------------------------------------------------
// Live Surface object
// ---------------------------------------------------------------------------

/**
 * Runtime representation of a surface. Registered via `registerSurface`.
 *
 * A surface may provide EITHER an adminLayout, a userLayout, or both —
 * depending on its `scope`.
 *
 * `disabled` surfaces intentionally have NO layout bindings: they exist only
 * as placeholders so the resolver can detect them and fall back to legacy.
 */
/**
 * Stable identifier for a page slot that a surface may override.
 *
 * Format: `{scope}.{area}.{page}`. Keeping ids stable lets surfaces provide
 * targeted overrides without knowing about router paths or file locations.
 *
 * Faz 2 (Bridge) introduces:
 *   - "admin.jobs.registry"
 *   - "admin.jobs.detail"
 *   - "admin.publish.center"
 *
 * Additional slots can be added in future phases without contract migration.
 */
export type SurfacePageKey =
  | "admin.jobs.registry"
  | "admin.jobs.detail"
  | "admin.publish.center"
  | (string & { __surfacePageKeyBrand?: never });

/**
 * Page override registry for a surface.
 *
 * Each entry is a React component the surface offers as a replacement for the
 * legacy page that lives at the same router path. The legacy page itself calls
 * `useSurfacePageOverride(key, LegacyComponent)` at render time; if the active
 * surface registered an override for `key`, the hook returns the override;
 * otherwise it returns the legacy component unchanged.
 *
 * This indirection is deliberate: router.tsx is immutable, so surfaces cannot
 * swap routes. Instead, legacy pages become dumb trampolines that defer to the
 * override when one exists. Fallback is automatic and total.
 */
export type SurfacePageOverrideMap = Partial<Record<SurfacePageKey, ComponentType>>;

export interface Surface {
  manifest: SurfaceManifest;
  /** Admin panel layout component. Required when scope is "admin" or "both". */
  adminLayout?: SurfaceLayoutComponent;
  /** User panel layout component. Required when scope is "user" or "both". */
  userLayout?: SurfaceLayoutComponent;
  /**
   * Optional CSS variable overrides merged on top of the active theme.
   * Applied by themeEngine when this surface is the resolved active surface.
   */
  tokenOverrides?: SurfaceTokenOverrides;
  /**
   * Optional page-level overrides keyed by `SurfacePageKey`. Faz 1 surfaces
   * (legacy, horizon) do NOT populate this — the entire point of a surface
   * in Faz 1 was a shell swap. Faz 2 (Bridge) uses this to selectively replace
   * a handful of admin pages while falling back to legacy for everything else.
   */
  pageOverrides?: SurfacePageOverrideMap;
}

// ---------------------------------------------------------------------------
// Resolved surface
// ---------------------------------------------------------------------------

/**
 * Why the resolver picked a particular surface. Useful for telemetry and for
 * the diagnostic badge rendered in dev builds.
 */
export type SurfaceResolutionReason =
  | "kill-switch-off"
  | "feature-flag-forced"
  | "user-preference"
  | "role-default"
  | "global-default"
  | "legacy-fallback"
  | "scope-mismatch-fallback"
  | "disabled-fallback"
  | "missing-fallback"
  | "error-fallback";

/** Result of the resolution pipeline. */
export interface ResolvedSurface {
  /** The surface actually selected for rendering. */
  surface: Surface;
  /** Why this surface was picked (for telemetry + dev badge). */
  reason: SurfaceResolutionReason;
  /** The id that was originally requested (may differ from surface.manifest.id). */
  requestedId: SurfaceId | null;
  /** The panel scope the resolution was performed for. */
  scope: "admin" | "user";
  /** Whether a fallback happened (anything that is not the requested id). */
  didFallback: boolean;
}

// ---------------------------------------------------------------------------
// Input to the resolver
// ---------------------------------------------------------------------------

/**
 * All inputs the resolver needs. Callers build this from the theme store +
 * settings + feature flags; the resolver is pure.
 */
export interface SurfaceResolutionInput {
  /** "admin" or "user" panel we are rendering right now. */
  scope: "admin" | "user";
  /** Kill switch. When false, resolver short-circuits to legacy/horizon. */
  infrastructureEnabled: boolean;
  /**
   * Highest-priority forced surface (feature flag / env). Passing null means
   * no force in effect.
   */
  forcedSurfaceId: SurfaceId | null;
  /** User-selected surface id (from themeStore.activeSurfaceId). */
  userSurfaceId: SurfaceId | null;
  /** Admin default surface id for the given scope (from settings). */
  roleDefaultId: SurfaceId | null;
  /** Global default surface id (from settings). Falls through to "legacy". */
  globalDefaultId: SurfaceId | null;
  /**
   * Set of surface ids that are explicitly enabled by settings. Disabled
   * surfaces in the registry are NEVER resolvable regardless of this set, but
   * this set lets admin settings gate surfaces the registry itself has marked
   * "alpha"/"beta"/"stable".
   */
  enabledSurfaceIds: ReadonlySet<SurfaceId>;
  /**
   * Legacy compatibility hint: if the user is on a pre-registry build where
   * only themeStore.layoutMode existed, pass it here and the resolver will
   * map "horizon" → horizon surface, anything else → legacy.
   */
  legacyLayoutMode?: "classic" | "horizon" | null;
}
