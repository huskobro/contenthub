/**
 * Theme Store — Wave 1 Final
 *
 * Zustand store for theme management.
 * - Active theme selection
 * - Theme registry (built-in + user-imported)
 * - Persistence to localStorage
 * - Theme switching applies CSS variables + updates tokens
 */

import { create } from "zustand";
import {
  type ThemeManifest,
  DEFAULT_THEME,
  VOID_TERMINAL_THEME,
  AURORA_DUSK_THEME,
  validateThemeManifest,
  type ThemeValidationError,
} from "../components/design-system/themeContract";
import { RADICAL_THEMES } from "../components/design-system/themes-radical";
import { updateSettingAdminValue, fetchEffectiveSetting } from "../api/effectiveSettingsApi";
import { setUserOverride, deleteUserOverride } from "../api/usersApi";
import { buildSurfacePickerEntry } from "../surfaces/selectableSurfaces";
import { getSurface } from "../surfaces/registry";
import type { SurfaceId } from "../surfaces/contract";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_ACTIVE = "contenthub:active-theme-id";
const STORAGE_KEY_CUSTOM = "contenthub:custom-themes";
// Surface Registry (Faz 1) — versioned surface preference storage.
// Format: { v: 1, id: string | null }
// Migration from v0 (no surface field) is handled in loadActiveSurfaceId().
const STORAGE_KEY_SURFACE = "contenthub:active-surface-id";
const SURFACE_STORAGE_VERSION = 1;

// ---------------------------------------------------------------------------
// Aurora theme gating — REMOVED.
// History: a short-lived hotfix gate (AURORA_GATED_THEME_IDS) used to mask
// Slate from the Aurora surface while cockpit.css carried Dusk-only literal
// foreground colors for breadcrumbs, ctxbar chrome, and the dark button
// variant. The codex/aurora-surface-sync-and-slate wave moved those literals
// into theme-aware tokens (--color-workspace-pill-fg, --color-breadcrumb-sep,
// --color-breadcrumb-last-fg, --color-statusbar-value-fg, --color-btn-dark-fg)
// with proper Slate overrides. With class-context parity reached, the gate is
// no longer required. Both Aurora-bound themes (aurora-dusk and obsidian-slate)
// render directly without coercion.
//
// Old exports (AURORA_GATED_THEME_IDS, AURORA_FALLBACK_THEME_ID,
// resolveSafeThemeIdForSurface, healGatedThemeForSurface) are intentionally
// gone. The companion test file themeStore.aurora-gate.unit.test.ts has been
// removed in the same change.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Built-in themes (cannot be deleted)
// ---------------------------------------------------------------------------

// Aurora theme curation — `codex/aurora-theme-curation` wave:
//   - Dropped EXAMPLE_WARM_EARTH_THEME (template/example placeholder, weak
//     product character, no real identity vs Aurora Dusk / Obsidian Slate).
//   - Dropped HORIZON_THEMES (four horizon-layout themes — horizon-chalk,
//     horizon-obsidian, horizon-sand, horizon-midnight). The horizon surface
//     still exists as a fallback/safety-net shell, but horizon-specific theme
//     manifests no longer ship as selectable gallery entries.
//   - Added AURORA_DUSK_THEME as the first entry so the gallery ordering puts
//     the canonical Aurora Dusk identity before Slate (default legacy id).
//
// Remaining gallery set (6 themes, full Aurora token coverage):
//   aurora-dusk, obsidian-slate (DEFAULT_THEME), void-terminal,
//   tokyo-neon, ink-and-wire, solar-ember.
const BUILTIN_THEMES: ThemeManifest[] = [
  AURORA_DUSK_THEME,
  DEFAULT_THEME,
  VOID_TERMINAL_THEME,
  ...RADICAL_THEMES,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadCustomThemes(): ThemeManifest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Re-validate on load
    return parsed.filter(
      (t: unknown) => validateThemeManifest(t).length === 0
    ) as ThemeManifest[];
  } catch {
    return [];
  }
}

function saveCustomThemes(themes: ThemeManifest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(themes));
  } catch {
    // localStorage full — silently fail
  }
}

function loadActiveThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE) || DEFAULT_THEME.id;
  } catch {
    return DEFAULT_THEME.id;
  }
}

function saveActiveThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, id);
  } catch {
    // silently fail
  }
  // Fire-and-forget: persist to backend settings
  updateSettingAdminValue("ui.active_theme", id).catch(() => {
    // Backend save failed — localStorage is still the primary source
  });
}

// ---------------------------------------------------------------------------
// Surface preference persistence (Faz 1)
// ---------------------------------------------------------------------------

/**
 * Load the persisted active surface id, running the v0 → v1 migration if a
 * legacy payload is encountered.
 *
 * Migration rules:
 *   - No payload at all            → return null (resolver will use defaults)
 *   - Corrupt JSON                 → clear slot, return null
 *   - Payload without `v`          → treat as v0 and migrate
 *   - v0 migration                 → if themeStore previously selected a
 *                                    horizon-flagged theme the caller will
 *                                    pass the layoutMode in; we store null
 *                                    here so the resolver inherits naturally.
 */
function loadActiveSurfaceId(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SURFACE);
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt → clean up and fall through.
      try {
        localStorage.removeItem(STORAGE_KEY_SURFACE);
      } catch {
        /* ignore */
      }
      return null;
    }
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as { v?: unknown; id?: unknown };
    // v0 migration: payload existed but lacked version field.
    if (typeof obj.v !== "number") {
      // Try the legacy shape where the slot held a bare string.
      if (typeof parsed === "string") {
        const migratedId = parsed as unknown as string;
        saveActiveSurfaceId(migratedId || null);
        return migratedId || null;
      }
      // Unknown legacy shape — drop it.
      try {
        localStorage.removeItem(STORAGE_KEY_SURFACE);
      } catch {
        /* ignore */
      }
      return null;
    }
    if (obj.v !== SURFACE_STORAGE_VERSION) {
      // Future-version downgrade: be conservative and ignore.
      return null;
    }
    if (obj.id === null) return null;
    if (typeof obj.id === "string" && obj.id.length > 0) return obj.id;
    return null;
  } catch {
    return null;
  }
}

function saveActiveSurfaceId(id: string | null): void {
  try {
    const payload = JSON.stringify({ v: SURFACE_STORAGE_VERSION, id });
    localStorage.setItem(STORAGE_KEY_SURFACE, payload);
  } catch {
    // silently fail
  }
}

// ---------------------------------------------------------------------------
// Role-scoped surface preference (Aurora surface-sync wave)
//
// Two backend setting keys, one per shell:
//   - ui.surface.preference.admin
//   - ui.surface.preference.user
//
// localStorage holds a single envelope (the legacy v1 STORAGE_KEY_SURFACE
// payload) acting as cache/fallback. Backend is the source of truth; on auth
// bootstrap the store hydrates by reading the key matching the CURRENT shell
// (URL prefix /admin → admin key, /user → user key). Cross-device consistency
// for the active shell is restored on every login. The other shell's
// preference is read lazily when the user navigates into that shell.
// ---------------------------------------------------------------------------

const SURFACE_PREFERENCE_KEYS = {
  admin: "ui.surface.preference.admin",
  user: "ui.surface.preference.user",
} as const;

export type SurfacePreferenceScope = "admin" | "user";

/**
 * Derive the active shell scope from the current URL. Falls back to `null`
 * when the document is not available (test/SSR) or the path matches neither
 * `/admin/*` nor `/user/*`. Callers that get `null` should NOT write to a
 * backend key — the preference is shell-bound by design.
 */
function deriveScopeFromLocation(): SurfacePreferenceScope | null {
  try {
    if (typeof window === "undefined" || !window.location) return null;
    const path = window.location.pathname || "";
    if (path.startsWith("/admin")) return "admin";
    if (path.startsWith("/user")) return "user";
    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitize a surface id against the picker rules for a given panel scope.
 * Returns the id as-is when it would be selectable; returns `null` when the
 * id is unknown, gated, scope-mismatched, hidden, or status-disabled. We
 * intentionally route through `buildSurfacePickerEntry` so the resolver and
 * the persistence layer apply the SAME rules — anything the resolver would
 * fall back away from never reaches the preference store.
 *
 * `null` is always allowed (it means "clear preference / use defaults").
 */
function sanitizeSurfaceForScope(
  id: string | null,
  scope: SurfacePreferenceScope,
  enabledSurfaceIds: ReadonlySet<SurfaceId>,
): string | null {
  if (id === null) return null;
  const surface = getSurface(id as SurfaceId);
  if (!surface) return null;
  const entry = buildSurfacePickerEntry(surface, {
    scope,
    enabledSurfaceIds,
    activeSurfaceId: null,
  });
  return entry.selectable ? id : null;
}

/**
 * Lazy snapshot reader cache. We avoid a static import of
 * `useSurfaceResolution` because that module already imports `themeStore`
 * (circular). Instead we resolve the module asynchronously on first call and
 * cache the typed snapshot reader. Callers that need the snapshot before
 * resolution completes get the conservative default (aurora not enabled).
 */
type SurfaceSnapshotReader = () => { auroraEnabled: boolean };
let cachedSnapshotReader: SurfaceSnapshotReader | null = null;
let snapshotReaderResolveStarted = false;

function ensureSnapshotReader(): void {
  if (cachedSnapshotReader || snapshotReaderResolveStarted) return;
  snapshotReaderResolveStarted = true;
  void import("../surfaces/useSurfaceResolution")
    .then((mod) => {
      const reader = (mod as { __getSurfaceSettingsSnapshot?: SurfaceSnapshotReader })
        .__getSurfaceSettingsSnapshot;
      if (typeof reader === "function") {
        cachedSnapshotReader = reader;
      }
    })
    .catch(() => {
      // Module unavailable (test env that mocks surfaces) — fall through.
    });
}

/**
 * Build the enabled-surface set the resolver and the picker share. Mirrors
 * `useSurfaceResolution`'s logic exactly — legacy + horizon are always-on
 * safety-nets; aurora is gated by `ui.surface.aurora.enabled`. We do a
 * synchronous best-effort here: if the cached snapshot says aurora is on, we
 * include it; otherwise we keep aurora out (conservative: no false-positive
 * persist writes).
 */
function readEnabledSurfaceIds(): ReadonlySet<SurfaceId> {
  ensureSnapshotReader();
  const set = new Set<SurfaceId>();
  set.add("legacy");
  set.add("horizon");
  if (cachedSnapshotReader) {
    try {
      const snap = cachedSnapshotReader();
      if (snap?.auroraEnabled) set.add("aurora");
    } catch {
      /* ignore */
    }
  }
  return set;
}

/**
 * Read auth identity (user id) without importing authStore directly. We avoid
 * the import to keep themeStore free of a circular dep with authStore (which
 * imports themeStore lazily for theme hydration). localStorage is the single
 * synchronous shared channel.
 */
function readAuthUserIdFromStorage(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const id = localStorage.getItem("contenthub:active-user-id");
    if (id && id.length > 0) return id;
    const raw = localStorage.getItem("contenthub:auth-user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown };
    return typeof parsed.id === "string" && parsed.id.length > 0 ? parsed.id : null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget backend persistence for a surface preference.
 *
 * Caller contract (Aurora-only finalization wave):
 *   - `setActiveSurface` MUST sanitize before calling here. This function
 *     re-runs sanitization as defense-in-depth (so a misuse from another
 *     code path cannot land a dirty value in backend) but the warning fire
 *     paths are no longer expected on the happy `setActiveSurface` flow.
 *
 * Writes only when:
 *   - scope is known (the caller knows which shell the preference belongs to)
 *   - the user is authenticated (we have an id to attach the override to)
 *   - the id still sanitizes cleanly (defense-in-depth)
 *
 * `null` clears the override (DELETE) instead of writing an empty string —
 * matches the resolver's "no preference → fall back to defaults" contract.
 *
 * Errors are swallowed: localStorage cache stays as the fallback so the user
 * sees no UI break when the backend is unreachable.
 */
function persistSurfacePreference(
  id: string | null,
  scope: SurfacePreferenceScope | null,
): void {
  if (scope === null) return; // unknown shell, do not write
  const userId = readAuthUserIdFromStorage();
  if (!userId) return; // unauthenticated — localStorage cache only
  const sanitized = sanitizeSurfaceForScope(id, scope, readEnabledSurfaceIds());
  const key = SURFACE_PREFERENCE_KEYS[scope];
  if (sanitized === null && id !== null) {
    // Defense-in-depth: a non-setActiveSurface caller passed an unsanitized
    // id. Refuse the write so the backend record stays clean. The proper
    // call site (setActiveSurface) sanitizes BEFORE calling here, so this
    // branch should not fire on the happy path.
    // eslint-disable-next-line no-console
    console.warn(
      `[themeStore] persistSurfacePreference: id="${id}" failed sanitization for scope="${scope}" (defense-in-depth).`,
    );
    return;
  }
  if (sanitized === null) {
    // Explicit clear — DELETE the override.
    deleteUserOverride(userId, key).catch(() => {
      // Backend save failed — localStorage is still the primary cache.
    });
    return;
  }
  setUserOverride(userId, key, sanitized).catch(() => {
    // Backend save failed — localStorage is still the primary cache.
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface ThemeState {
  /** Active theme ID */
  activeThemeId: string;
  /** All available themes (builtin + custom) */
  themes: ThemeManifest[];
  /**
   * Active surface id (Surface Registry — Faz 1).
   * `null` means "no explicit user preference, let the resolver decide".
   * This field is persisted separately from the active theme (v1 payload).
   */
  activeSurfaceId: string | null;
  /** Get the active theme manifest */
  activeTheme: () => ThemeManifest;
  /** Switch to a different theme */
  setActiveTheme: (id: string) => void;
  /**
   * Set the active surface id and persist the preference.
   *
   * Behavior:
   *   - In-memory state + localStorage cache are updated immediately.
   *   - Backend role-scoped key (`ui.surface.preference.{admin|user}`) is
   *     written fire-and-forget when (a) the caller passes `scope` OR the
   *     URL prefix can be derived AND (b) the user is authenticated AND
   *     (c) the id sanitizes cleanly for the resolved scope.
   *   - Sanitization rejects unknown / disabled / hidden / scope-mismatched
   *     ids — those would also be refused by the resolver, so we keep the
   *     persisted preference in lock-step with what the resolver can act on.
   *   - `null` clears the preference (DELETE on backend, `{v:1, id:null}`
   *     in localStorage).
   *
   * `scope` is optional; when omitted, the store derives it from
   * `window.location.pathname` (`/admin/*` → admin, `/user/*` → user). In
   * non-browser environments (tests, SSR), the backend write is skipped.
   */
  setActiveSurface: (id: string | null, scope?: SurfacePreferenceScope) => void;
  /** Import a new theme. Returns validation errors (empty = success). */
  importTheme: (manifest: unknown) => ThemeValidationError[];
  /** Remove a custom theme by id. Built-in themes cannot be removed. */
  removeTheme: (id: string) => boolean;
  /** Export a theme as JSON string */
  exportTheme: (id: string) => string | null;
  /** Check if a theme is built-in */
  isBuiltin: (id: string) => boolean;
  /**
   * Hydrate theme from backend.
   *
   * Default mode (opportunistic): only when localStorage has no saved theme.
   *   Fast-path for first load + returning visitors.
   *
   * Force mode (cross-device): overrides localStorage with the backend value
   *   whenever they disagree. Use at login / auth bootstrap so a different
   *   browser on the same account reflects the last chosen theme. Still a
   *   no-op if the backend value is absent or the theme id is unknown.
   */
  hydrateFromBackend: (opts?: { force?: boolean }) => void;
  /**
   * Hydrate surface preference from backend.
   *
   * Reads the role-scoped key (`ui.surface.preference.{admin|user}`) for the
   * current shell and writes the result into in-memory state + localStorage
   * cache. Behavior mirrors `hydrateFromBackend`:
   *
   *   - Opportunistic (default): only when localStorage has no cached
   *     surface AND the in-memory `activeSurfaceId` is null.
   *   - Force mode: overrides cache with backend value when they disagree.
   *     Use at login / auth bootstrap for cross-device consistency.
   *
   * Sanitization gates the write: ids the resolver would reject are
   * discarded (we DO NOT mirror a bad backend value into local state).
   *
   * `scope` is optional; when omitted, derives from URL. When neither URL
   * nor an explicit scope are available, the call is a no-op.
   */
  hydrateSurfaceFromBackend: (opts?: { force?: boolean; scope?: SurfacePreferenceScope }) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const customThemes = loadCustomThemes();
  const allThemes = [...BUILTIN_THEMES, ...customThemes];
  const savedId = loadActiveThemeId();
  const initialId = allThemes.some((t) => t.id === savedId) ? savedId : DEFAULT_THEME.id;
  const initialSurfaceId = loadActiveSurfaceId();

  return {
    activeThemeId: initialId,
    themes: allThemes,
    activeSurfaceId: initialSurfaceId,

    activeTheme: () => {
      const state = get();
      return state.themes.find((t) => t.id === state.activeThemeId) || DEFAULT_THEME;
    },

    setActiveTheme: (id: string) => {
      const { themes } = get();
      if (!themes.some((t) => t.id === id)) return;
      // Aurora gate: surfaces/aurora enforces its own filter in AuroraThemesPage.
      // We intentionally do NOT refuse the id here because non-Aurora surfaces
      // (legacy, horizon) may still honor all built-in themes.
      set({ activeThemeId: id });
      saveActiveThemeId(id);
    },

    setActiveSurface: (id: string | null, scope?: SurfacePreferenceScope) => {
      // Source-of-truth contract (Aurora-only finalization wave):
      //
      //   in-memory  (this tab, this navigation)        — always reflects
      //                                                   the latest click
      //   localStorage  (this browser, all tabs/loads)  — only persists when
      //                                                   the id sanitizes
      //                                                   for the resolved
      //                                                   scope (or is null)
      //   backend  (this user, all browsers)            — only writes when
      //                                                   scope known + auth
      //                                                   ok + sanitization ok
      //
      // The split exists so a click on a surface card cannot leave a stale
      // "dirty" id behind that the resolver would later reject. localStorage
      // is now treated as a strict cache mirror of what the backend would
      // accept — if we won't write it to backend, we do not write it locally
      // either. Otherwise a bad cache outlives the session and forces the
      // user to manually clear storage.
      //
      // `null` clears in-memory + clears LS + DELETEs backend (idempotent).
      const resolvedScope = scope ?? deriveScopeFromLocation();

      // Always update in-memory state — the user clicked, the UI must respond
      // for this navigation. We do NOT persist if the choice is invalid for
      // the current scope; we write the in-memory value so the user can see
      // the result of their click for diagnostics, but a reload heals the
      // tab back to the resolver's pick.
      set({ activeSurfaceId: id });

      if (id === null) {
        // Explicit clear — wipe local cache, hand off to backend DELETE.
        saveActiveSurfaceId(null);
        persistSurfacePreference(null, resolvedScope);
        return;
      }

      if (resolvedScope === null) {
        // We cannot validate without a shell scope (e.g. user clicked from
        // /login or another non-shell route). Refuse to pollute localStorage.
        // In-memory state already updated above so the UI responds; the
        // resolver on next mount will pick a sane surface.
        // eslint-disable-next-line no-console
        console.warn(
          `[themeStore] setActiveSurface("${id}") called outside a shell route; persistence skipped (in-memory only).`,
        );
        return;
      }

      const sanitized = sanitizeSurfaceForScope(
        id,
        resolvedScope,
        readEnabledSurfaceIds(),
      );
      if (sanitized === null) {
        // The id failed sanitization (gated/disabled/unknown/scope-mismatch).
        // Refuse to write to LS or backend so the cache stays in lock-step
        // with what the resolver will accept.
        // eslint-disable-next-line no-console
        console.warn(
          `[themeStore] Refusing to persist surface preference "${id}" for scope="${resolvedScope}" (sanitization failed). In-memory state still set so the UI reflects the click; reload will revert to the resolver's pick.`,
        );
        return;
      }

      // Sanitization passed — mirror to LS and backend.
      saveActiveSurfaceId(sanitized);
      persistSurfacePreference(sanitized, resolvedScope);
    },

    importTheme: (manifest: unknown) => {
      const errors = validateThemeManifest(manifest);
      if (errors.length > 0) return errors;

      const m = manifest as ThemeManifest;
      const { themes } = get();

      // Check for duplicate ID
      const existing = themes.findIndex((t) => t.id === m.id);
      let newThemes: ThemeManifest[];

      if (existing >= 0) {
        // If it's a builtin, don't overwrite
        if (BUILTIN_THEMES.some((b) => b.id === m.id)) {
          return [{ path: "id", message: "Yerlesik tema uzerine yazilamaz." }];
        }
        // Replace existing custom theme
        newThemes = [...themes];
        newThemes[existing] = m;
      } else {
        newThemes = [...themes, m];
      }

      set({ themes: newThemes });
      // Save only custom themes
      const custom = newThemes.filter(
        (t) => !BUILTIN_THEMES.some((b) => b.id === t.id)
      );
      saveCustomThemes(custom);
      return [];
    },

    removeTheme: (id: string) => {
      if (BUILTIN_THEMES.some((b) => b.id === id)) return false;
      const { themes, activeThemeId } = get();
      const newThemes = themes.filter((t) => t.id !== id);
      if (newThemes.length === themes.length) return false;

      const newState: Partial<ThemeState> & { themes: ThemeManifest[] } = { themes: newThemes };
      // If we're removing the active theme, fall back to default
      if (activeThemeId === id) {
        (newState as { activeThemeId: string }).activeThemeId = DEFAULT_THEME.id;
        saveActiveThemeId(DEFAULT_THEME.id);
      }
      set(newState);

      const custom = newThemes.filter(
        (t) => !BUILTIN_THEMES.some((b) => b.id === t.id)
      );
      saveCustomThemes(custom);
      return true;
    },

    exportTheme: (id: string) => {
      const theme = get().themes.find((t) => t.id === id);
      if (!theme) return null;
      return JSON.stringify(theme, null, 2);
    },

    isBuiltin: (id: string) => BUILTIN_THEMES.some((b) => b.id === id),

    hydrateFromBackend: (opts?: { force?: boolean }): void => {
      const force = opts?.force === true;

      let localSaved: string | null = null;
      try {
        localSaved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      } catch {
        // localStorage unavailable (test env, SSR) — continue to backend hydration
      }
      // Opportunistic path: localStorage already has a theme, nothing to do.
      if (!force && localSaved) return;

      fetchEffectiveSetting("ui.active_theme")
        .then((setting) => {
          const backendThemeId = setting?.effective_value;
          if (typeof backendThemeId !== "string" || !backendThemeId) return;

          const { themes, activeThemeId } = get();
          if (!themes.some((t) => t.id === backendThemeId)) return;

          // Force mode: apply only when the backend value truly differs.
          // Avoids a pointless state update + re-render on the common path.
          if (force && backendThemeId === activeThemeId && localSaved === backendThemeId) {
            return;
          }

          set({ activeThemeId: backendThemeId });
          try {
            localStorage.setItem(STORAGE_KEY_ACTIVE, backendThemeId);
          } catch {
            // silently fail
          }
        })
        .catch(() => {
          // Backend unreachable — use default, no error
        });
    },

    hydrateSurfaceFromBackend: (opts?: {
      force?: boolean;
      scope?: SurfacePreferenceScope;
    }): void => {
      const force = opts?.force === true;
      const scope = opts?.scope ?? deriveScopeFromLocation();
      // Without a known shell scope we cannot pick a key — leave cache as-is.
      if (scope === null) return;

      const { activeSurfaceId } = get();
      let localSaved: string | null = null;
      try {
        localSaved = localStorage.getItem(STORAGE_KEY_SURFACE);
      } catch {
        // localStorage unavailable — continue to backend hydration.
      }
      // Opportunistic path: cache or in-memory state already holds a value;
      // nothing to do unless the caller forced a refresh (e.g. login).
      if (!force && (activeSurfaceId !== null || localSaved !== null)) return;

      const key = SURFACE_PREFERENCE_KEYS[scope];
      fetchEffectiveSetting(key)
        .then((setting) => {
          const backendId = setting?.effective_value;
          if (backendId === null || backendId === undefined) {
            // Backend has no preference yet — clear stale local cache when
            // forced (cross-device path). On the opportunistic path, leave
            // the cache alone so the user keeps a deterministic surface.
            if (force) {
              set({ activeSurfaceId: null });
              saveActiveSurfaceId(null);
            }
            return;
          }
          if (typeof backendId !== "string" || !backendId) return;

          // Sanitize: refuse to mirror a value the resolver would reject.
          const sanitized = sanitizeSurfaceForScope(
            backendId,
            scope,
            readEnabledSurfaceIds(),
          );
          if (sanitized === null) {
            // Backend value is stale (e.g. references a removed surface).
            // Do NOT propagate to local state.
            // eslint-disable-next-line no-console
            console.warn(
              `[themeStore] Backend surface preference "${backendId}" failed sanitization for scope="${scope}"; ignored.`,
            );
            return;
          }

          if (force && sanitized === activeSurfaceId) return;
          set({ activeSurfaceId: sanitized });
          saveActiveSurfaceId(sanitized);
        })
        .catch(() => {
          // Backend unreachable — keep cache as-is, no error surfaced.
        });
    },
  };
});

// Hydrate from backend on module load (runs once).
// If localStorage already has a theme, this is a no-op.
try {
  useThemeStore.getState().hydrateFromBackend();
} catch {
  // Silently fail in test/SSR environments
}
// Surface preference hydration: opportunistic on module load, force on
// login. Module-load path only acts when neither in-memory state nor cache
// holds a value, so first paint can still render with the backend pref
// when localStorage was cleared. Auth bootstrap (`applyTokenResponse`)
// triggers a force-mode call to overwrite stale cache cross-device.
try {
  useThemeStore.getState().hydrateSurfaceFromBackend();
} catch {
  // Silently fail in test/SSR environments
}
