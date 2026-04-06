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

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_ACTIVE = "contenthub:active-theme-id";
const STORAGE_KEY_CUSTOM = "contenthub:custom-themes";

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
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface ThemeState {
  /** Active theme ID */
  activeThemeId: string;
  /** All available themes (builtin + custom) */
  themes: ThemeManifest[];
  /** Get the active theme manifest */
  activeTheme: () => ThemeManifest;
  /** Switch to a different theme */
  setActiveTheme: (id: string) => void;
  /** Import a new theme. Returns validation errors (empty = success). */
  importTheme: (manifest: unknown) => ThemeValidationError[];
  /** Remove a custom theme by id. Built-in themes cannot be removed. */
  removeTheme: (id: string) => boolean;
  /** Export a theme as JSON string */
  exportTheme: (id: string) => string | null;
  /** Check if a theme is built-in */
  isBuiltin: (id: string) => boolean;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const customThemes = loadCustomThemes();
  const allThemes = [...BUILTIN_THEMES, ...customThemes];
  const savedId = loadActiveThemeId();
  const initialId = allThemes.some((t) => t.id === savedId) ? savedId : DEFAULT_THEME.id;

  return {
    activeThemeId: initialId,
    themes: allThemes,

    activeTheme: () => {
      const state = get();
      return state.themes.find((t) => t.id === state.activeThemeId) || DEFAULT_THEME;
    },

    setActiveTheme: (id: string) => {
      const { themes } = get();
      if (!themes.some((t) => t.id === id)) return;
      set({ activeThemeId: id });
      saveActiveThemeId(id);
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
  };
});
