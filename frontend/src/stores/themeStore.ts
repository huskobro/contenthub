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
  EXAMPLE_WARM_EARTH_THEME,
  validateThemeManifest,
  type ThemeValidationError,
} from "../components/design-system/themeContract";
import { RADICAL_THEMES } from "../components/design-system/themes-radical";
import { HORIZON_THEMES } from "../components/design-system/themes-horizon";
import { updateSettingAdminValue, fetchEffectiveSetting } from "../api/effectiveSettingsApi";

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
// Aurora theme gating (short-lived hotfix per CLAUDE.md → Theme Availability
// and Gating). Themes listed here are known to have class-context breakage
// inside the Aurora surface (see docs/architecture/canonical-routes-and-surfaces.md
// § "Current Slate gap"). The Aurora surface refuses to render these themes
// and falls back to AURORA_FALLBACK_THEME_ID until the class-context migration
// lands on a follow-up branch that removes this gate.
//
// Tracking: qa/aurora-real-user-hardening → follow-up class-context migration.
// This constant MUST be removed once the referenced classes in
// frontend/src/styles/aurora/cockpit.css no longer hard-code Dusk-only token
// chains for breadcrumbs, caption chips, and inset-surface contexts.
// ---------------------------------------------------------------------------

export const AURORA_GATED_THEME_IDS: ReadonlySet<string> = new Set<string>([
  "obsidian-slate",
]);

/**
 * Aurora CSS (frontend/src/styles/aurora/tokens.css) scopes its default "Dusk"
 * token set under the bare `[data-surface="aurora"]` selector, so ANY theme id
 * that does NOT match a specific override selector (e.g. `obsidian-slate`)
 * renders through Dusk tokens. We still want a deterministic, registered
 * theme manifest as the fallback target so `activeThemeId` stays coherent and
 * so `applyThemeToDOM` receives a real manifest. `midnight-ultraviolet` is a
 * registered dark built-in theme that has no Aurora class-context issues.
 * When the class-context migration lands and this gate is removed, callers
 * should fall back to whatever the default theme becomes at that point.
 */
export const AURORA_FALLBACK_THEME_ID = "midnight-ultraviolet";

/**
 * Aurora surface id — matches the manifest registered in
 * frontend/src/surfaces/manifests/register.tsx. Duplicated here (rather than
 * imported) to keep themeStore free of circular imports with the surface
 * registry module graph.
 */
const AURORA_SURFACE_ID = "aurora";

/**
 * Resolve the theme id that should actually be rendered for a given surface.
 * Pure function — does NOT mutate state or localStorage. Callers that also
 * want to heal persistence should use `healGatedThemeForSurface()`.
 */
export function resolveSafeThemeIdForSurface(
  themeId: string,
  surfaceId: string | null | undefined,
): string {
  if (surfaceId === AURORA_SURFACE_ID && AURORA_GATED_THEME_IDS.has(themeId)) {
    return AURORA_FALLBACK_THEME_ID;
  }
  return themeId;
}

// ---------------------------------------------------------------------------
// Built-in themes (cannot be deleted)
// ---------------------------------------------------------------------------

const BUILTIN_THEMES: ThemeManifest[] = [DEFAULT_THEME, VOID_TERMINAL_THEME, EXAMPLE_WARM_EARTH_THEME, ...RADICAL_THEMES, ...HORIZON_THEMES];

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
   * Set the active surface id. Pass `null` to clear the preference and fall
   * back to role/global defaults. The resolver decides whether the id is
   * usable — invalid ids still persist but result in a legacy fallback.
   */
  setActiveSurface: (id: string | null) => void;
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
   * Heal Aurora-incompatible persisted state. If the currently active theme
   * is gated on the Aurora surface and the caller's surface is Aurora, this
   * rewrites both the store state and localStorage to the Aurora fallback
   * theme. No-op when the theme is safe. Safe to call from ThemeSurfaceBinder
   * on every surface change — it only writes when a mismatch is detected.
   *
   * Short-lived; removed alongside AURORA_GATED_THEME_IDS.
   */
  healGatedThemeForSurface: (surfaceId: string | null | undefined) => void;
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

    setActiveSurface: (id: string | null) => {
      set({ activeSurfaceId: id });
      saveActiveSurfaceId(id);
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

    healGatedThemeForSurface: (surfaceId: string | null | undefined) => {
      const { activeThemeId, themes } = get();
      const safeId = resolveSafeThemeIdForSurface(activeThemeId, surfaceId);
      if (safeId === activeThemeId) return;
      // Only heal if the fallback theme is actually registered; otherwise do
      // nothing so we don't strand the user on an unknown id.
      if (!themes.some((t) => t.id === safeId)) return;
      set({ activeThemeId: safeId });
      saveActiveThemeId(safeId);
    },

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
  };
});

// Hydrate from backend on module load (runs once).
// If localStorage already has a theme, this is a no-op.
try {
  useThemeStore.getState().hydrateFromBackend();
} catch {
  // Silently fail in test/SSR environments
}
