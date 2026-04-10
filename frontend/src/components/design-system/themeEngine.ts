/**
 * Theme Engine — Wave 1 Final
 *
 * Bridges ThemeManifest → CSS custom properties → runtime tokens.
 * When the active theme changes, this engine:
 * 1. Generates CSS custom properties from the theme manifest
 * 2. Applies them to document.documentElement
 * 3. Updates the Google Fonts import if font families changed
 *
 * The tokens.ts file reads from CSS variables as fallback,
 * but for inline-style React components we also re-export resolved values.
 */

import type { ThemeManifest } from "./themeContract";
import { DEFAULT_THEME } from "./themeContract";

// ---------------------------------------------------------------------------
// CSS Variable Generation
// ---------------------------------------------------------------------------

/**
 * Generate all CSS custom properties from a theme manifest.
 * Returns a flat Record of `--ch-*` variable names to values.
 */
export function generateCSSVariables(theme: ThemeManifest): Record<string, string> {
  const vars: Record<string, string> = {};

  // Typography
  vars["--ch-font-heading"] = theme.typography.heading.stack;
  vars["--ch-font-body"] = theme.typography.body.stack;
  vars["--ch-font-mono"] = theme.typography.mono.stack;

  for (const [key, val] of Object.entries(theme.typography.size)) {
    vars[`--ch-text-${key}`] = val;
  }
  for (const [key, val] of Object.entries(theme.typography.weight)) {
    vars[`--ch-weight-${key}`] = String(val);
  }
  for (const [key, val] of Object.entries(theme.typography.lineHeight)) {
    vars[`--ch-leading-${key}`] = String(val);
  }

  // Colors — brand
  for (const [key, val] of Object.entries(theme.colors.brand)) {
    vars[`--ch-brand-${key}`] = val;
  }

  // Colors — neutral
  for (const [key, val] of Object.entries(theme.colors.neutral)) {
    vars[`--ch-neutral-${key}`] = val;
  }

  // Colors — semantic
  for (const sem of ["success", "warning", "error", "info"] as const) {
    const sc = theme.colors[sem];
    vars[`--ch-${sem}-light`] = sc.light;
    vars[`--ch-${sem}-base`] = sc.base;
    vars[`--ch-${sem}-dark`] = sc.dark;
    vars[`--ch-${sem}-text`] = sc.text;
  }

  // Colors — surface (skip undefined optional fields)
  for (const [key, val] of Object.entries(theme.colors.surface)) {
    if (val != null) {
      vars[`--ch-surface-${key}`] = val;
    }
  }

  // Colors — border
  for (const [key, val] of Object.entries(theme.colors.border)) {
    vars[`--ch-border-${key}`] = val;
  }

  // Focus
  vars["--ch-focus"] = theme.colors.focus;

  // Spacing
  for (const [key, val] of Object.entries(theme.spacing)) {
    vars[`--ch-space-${key}`] = val;
  }

  // Radius
  for (const [key, val] of Object.entries(theme.radius)) {
    vars[`--ch-radius-${key}`] = val;
  }

  // Shadow
  for (const [key, val] of Object.entries(theme.shadow)) {
    vars[`--ch-shadow-${key}`] = val;
  }

  // Motion
  vars["--ch-motion-fast"] = `${theme.motion.fast} ${theme.motion.easing}`;
  vars["--ch-motion-normal"] = `${theme.motion.normal} ${theme.motion.easing}`;
  vars["--ch-motion-slow"] = `${theme.motion.slow} ${theme.motion.easing}`;

  // Layout
  vars["--ch-sidebar-width"] = theme.layout.sidebarWidth;
  vars["--ch-sidebar-collapsed-width"] = theme.layout.sidebarCollapsedWidth;
  vars["--ch-header-height"] = theme.layout.headerHeight;
  vars["--ch-page-max-width"] = theme.layout.pageMaxWidth;
  vars["--ch-page-padding"] = theme.layout.pagePadding;

  return vars;
}

// ---------------------------------------------------------------------------
// Apply theme to DOM
// ---------------------------------------------------------------------------

/**
 * Surface token override plumbing — Faz 1.
 *
 * When the Surface Registry resolves a surface whose manifest provides
 * `tokenOverrides`, the keys set by the previous surface must be rolled back
 * before the new overrides are applied. We track the currently applied
 * override keys in this module so `applyThemeToDOM` can cleanly switch
 * between surfaces without leaking stale variables.
 */
let currentSurfaceId: string | null = null;
let currentSurfaceOverrideKeys: string[] = [];

/** Apply all CSS custom properties from a theme to the document root */
export function applyThemeToDOM(
  theme: ThemeManifest,
  options?: { surfaceId?: string | null; surfaceOverrides?: Record<string, string> | null },
): void {
  const root = document.documentElement;
  const vars = generateCSSVariables(theme);

  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }

  // Update body font family directly (for base rendering)
  document.body.style.fontFamily = theme.typography.body.stack;

  // Update the color-scheme meta if needed
  const bgColor = theme.colors.surface.page;
  document.body.style.background = bgColor;
  document.body.style.color = theme.colors.neutral[900];

  // Update focus-visible outline color via CSS variable
  root.style.setProperty("--ch-focus-ring", theme.colors.focus);

  // Set data-theme attribute for theme-specific CSS selectors
  root.setAttribute("data-theme", theme.id);

  // Update Google Fonts link if fonts changed
  updateGoogleFontsLink(theme);

  // ---- Surface overrides (Faz 1) ----------------------------------------
  // Roll back previous surface overrides that are NOT in the new set.
  const nextOverrides = options?.surfaceOverrides ?? null;
  const nextKeys = nextOverrides ? Object.keys(nextOverrides) : [];
  for (const key of currentSurfaceOverrideKeys) {
    if (!nextKeys.includes(key)) {
      root.style.removeProperty(key);
    }
  }
  // Apply the new overrides (guarded to only touch --ch-* custom props).
  if (nextOverrides) {
    for (const [key, val] of Object.entries(nextOverrides)) {
      if (key.startsWith("--ch-")) {
        root.style.setProperty(key, val);
      }
    }
  }
  currentSurfaceOverrideKeys = nextKeys;

  // data-surface attribute for surface-specific CSS selectors.
  const nextSurfaceId = options?.surfaceId ?? null;
  currentSurfaceId = nextSurfaceId;
  if (nextSurfaceId) {
    root.setAttribute("data-surface", nextSurfaceId);
  } else {
    root.removeAttribute("data-surface");
  }
}

/** Return the currently applied surface id (or null). Used by tests. */
export function getCurrentSurfaceId(): string | null {
  return currentSurfaceId;
}

/** Remove all CSS custom properties (reset) */
export function removeThemeFromDOM(): void {
  const root = document.documentElement;
  const vars = generateCSSVariables(DEFAULT_THEME);
  for (const key of Object.keys(vars)) {
    root.style.removeProperty(key);
  }
}

// ---------------------------------------------------------------------------
// Google Fonts dynamic loader
// ---------------------------------------------------------------------------

const FONT_LINK_ID = "contenthub-theme-fonts";

function updateGoogleFontsLink(theme: ThemeManifest): void {
  // Collect unique font families (skip system fonts)
  const families = new Set<string>();
  const systemFonts = ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif", "monospace"];

  for (const font of [theme.typography.heading, theme.typography.body, theme.typography.mono]) {
    if (!systemFonts.some((sf) => font.family.toLowerCase().includes(sf.toLowerCase()))) {
      families.add(font.family);
    }
  }

  if (families.size === 0) return;

  // Build Google Fonts URL
  const params = Array.from(families).map((f) => {
    const encoded = f.replace(/\s+/g, "+");
    return `family=${encoded}:wght@400;500;600;700`;
  });

  const url = `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;

  // Update or create the link element
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (link) {
    if (link.href !== url) {
      link.href = url;
    }
  } else {
    link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }
}

// ---------------------------------------------------------------------------
// Resolve tokens from theme (for inline styles)
// ---------------------------------------------------------------------------

/**
 * Build the complete token set from a theme manifest.
 * This is used by tokens.ts to derive its exports.
 */
export function resolveTokens(theme: ThemeManifest) {
  return {
    colors: {
      ...theme.colors,
    },
    typography: {
      fontFamily: theme.typography.body.stack,
      headingFamily: theme.typography.heading.stack,
      monoFamily: theme.typography.mono.stack,
      size: { ...theme.typography.size },
      weight: { ...theme.typography.weight },
      lineHeight: { ...theme.typography.lineHeight },
    },
    spacing: { ...theme.spacing },
    radius: { ...theme.radius },
    shadow: { ...theme.shadow },
    transition: {
      fast: `${theme.motion.fast} ${theme.motion.easing}`,
      normal: `${theme.motion.normal} ${theme.motion.easing}`,
      slow: `${theme.motion.slow} ${theme.motion.easing}`,
    },
    zIndex: {
      sidebar: 100,
      header: 110,
      dropdown: 200,
      modal: 300,
      toast: 400,
    },
    layout: { ...theme.layout },
  };
}
