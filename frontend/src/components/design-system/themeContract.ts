/**
 * Theme Contract — Wave 1 Final
 *
 * Canonical theme contract / manifest system.
 * This is the SINGLE SOURCE OF TRUTH for all visual tokens.
 *
 * AI-Friendly: Give this file to any AI and say
 * "generate a new theme for this system" — the AI will produce
 * a valid ThemeManifest JSON that can be imported into ContentHub.
 *
 * Machine-readable AND human-readable.
 */

// ---------------------------------------------------------------------------
// Theme Contract Type Definitions
// ---------------------------------------------------------------------------

/** Font stack definition */
export interface ThemeFontStack {
  /** Primary font family (e.g. "Inter") */
  family: string;
  /** Full CSS font-family with fallbacks */
  stack: string;
}

/** Typography scale definition */
export interface ThemeTypography {
  /** Heading font (used for h1-h6, page titles) */
  heading: ThemeFontStack;
  /** Body font (used for paragraphs, labels, UI text) */
  body: ThemeFontStack;
  /** Monospace font (used for code, IDs, technical values) */
  mono: ThemeFontStack;

  /** Font size scale (rem values) */
  size: {
    xs: string;    // ~11px
    sm: string;    // ~12px
    base: string;  // ~13px
    md: string;    // ~14px
    lg: string;    // ~16px
    xl: string;    // ~18px
    "2xl": string; // ~22px
    "3xl": string; // ~28px
  };

  /** Font weight scale */
  weight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };

  /** Line height scale */
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };

  /** Letter spacing (optional fine-tuning) */
  letterSpacing?: {
    tight: string;
    normal: string;
    wide: string;
  };
}

/** Semantic color token */
export interface ThemeSemanticColor {
  light: string;
  base: string;
  dark: string;
  text: string;
}

/** Color palette definition */
export interface ThemeColors {
  /** Brand color scale (50-900) */
  brand: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };

  /** Neutral gray scale (0-950) */
  neutral: {
    0: string;
    25: string;
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };

  /** Semantic colors */
  success: ThemeSemanticColor;
  warning: ThemeSemanticColor;
  error: ThemeSemanticColor;
  info: ThemeSemanticColor;

  /** Surface accents */
  surface: {
    page: string;
    card: string;
    elevated: string;
    inset: string;
    sidebar: string;
    sidebarHover: string;
    sidebarActive: string;
  };

  /** Border shades */
  border: {
    subtle: string;
    default: string;
    strong: string;
  };

  /** Focus ring color */
  focus: string;

  /** Chart/visualization colors (optional) */
  chart?: string[];
}

/** Spacing scale definition */
export interface ThemeSpacing {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
}

/** Border radius scale */
export interface ThemeRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

/** Shadow scale */
export interface ThemeShadow {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl?: string;
  "2xl"?: string;
}

/** Motion/animation configuration */
export interface ThemeMotion {
  /** Duration in ms */
  fast: string;
  normal: string;
  slow: string;
  /** CSS easing function */
  easing: string;
}

/** Layout constants */
export interface ThemeLayout {
  sidebarWidth: string;
  sidebarCollapsedWidth: string;
  headerHeight: string;
  pageMaxWidth: string;
  pagePadding: string;
}

/** UI density setting */
export type ThemeDensity = "compact" | "comfortable" | "spacious";

// ---------------------------------------------------------------------------
// Theme Manifest — the complete theme definition
// ---------------------------------------------------------------------------

/**
 * ThemeManifest is the canonical format for a ContentHub theme.
 *
 * To create a new theme:
 * 1. Copy the DEFAULT_THEME below as a starting point
 * 2. Modify the values you want to change
 * 3. Import it via the Theme Registry UI
 *
 * Or ask an AI: "Generate a ThemeManifest JSON for a warm, earthy theme"
 */
export interface ThemeManifest {
  /** Unique theme identifier (kebab-case) */
  id: string;
  /** Human-readable theme name */
  name: string;
  /** Short description of the theme's character */
  description: string;
  /** Author name or "system" for built-in themes */
  author: string;
  /** Semantic version */
  version: string;
  /** Brand/product tone keywords (e.g. "professional", "warm", "minimal") */
  tone: string[];

  /** Typography system */
  typography: ThemeTypography;
  /** Color system */
  colors: ThemeColors;
  /** Spacing scale */
  spacing: ThemeSpacing;
  /** Border radius scale */
  radius: ThemeRadius;
  /** Shadow scale */
  shadow: ThemeShadow;
  /** Motion/animation */
  motion: ThemeMotion;
  /** Layout constants */
  layout: ThemeLayout;
  /** UI density */
  density: ThemeDensity;
}

// ---------------------------------------------------------------------------
// Default Theme — "Obsidian Slate"
// ---------------------------------------------------------------------------

export const DEFAULT_THEME: ThemeManifest = {
  id: "obsidian-slate",
  name: "Obsidian Slate",
  description: "ContentHub'un varsayilan temasi. Profesyonel, temiz ve modern bir admin deneyimi sunar.",
  author: "system",
  version: "1.0.0",
  tone: ["professional", "clean", "modern", "neutral"],

  typography: {
    heading: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    body: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    mono: {
      family: "JetBrains Mono",
      stack: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    },
    size: {
      xs: "0.6875rem",
      sm: "0.75rem",
      base: "0.8125rem",
      md: "0.875rem",
      lg: "1rem",
      xl: "1.125rem",
      "2xl": "1.5rem",
      "3xl": "2rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.625 },
    letterSpacing: { tight: "-0.01em", normal: "0", wide: "0.05em" },
  },

  colors: {
    brand: {
      50: "#eef2ff", 100: "#dce4ff", 200: "#bccaff", 300: "#94adff",
      400: "#6b8aff", 500: "#4f6fff", 600: "#3d5afe", 700: "#3451e8",
      800: "#2d46d0", 900: "#283fb5",
    },
    neutral: {
      0: "#ffffff", 25: "#fcfcfd", 50: "#f8f9fb", 100: "#f1f3f5",
      200: "#e9ecef", 300: "#dee2e6", 400: "#ced4da", 500: "#adb5bd",
      600: "#868e96", 700: "#495057", 800: "#343a40", 900: "#212529",
      950: "#141517",
    },
    success: { light: "#d3f9d8", base: "#37b24d", dark: "#2b8a3e", text: "#1b5e20" },
    warning: { light: "#fff3bf", base: "#f59f00", dark: "#e67700", text: "#7c4a00" },
    error: { light: "#ffe3e3", base: "#f03e3e", dark: "#c92a2a", text: "#921515" },
    info: { light: "#d0ebff", base: "#339af0", dark: "#1c7ed6", text: "#0c4a7e" },
    surface: {
      page: "#f5f6fa", card: "#ffffff", elevated: "#ffffff",
      inset: "#eef0f6", sidebar: "#131419", sidebarHover: "#1e2030",
      sidebarActive: "#282a3c",
    },
    border: { subtle: "#e4e7ef", default: "#d5d9e5", strong: "#bec4d4" },
    focus: "#3d5afe",
    chart: ["#3d5afe", "#37b24d", "#f59f00", "#f03e3e", "#339af0", "#7c3aed", "#e64980"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "6px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(0,0,0,0.06), 0 1px 1px rgba(0,0,0,0.04)",
    sm: "0 2px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
    md: "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
    lg: "0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)",
    xl: "0 16px 48px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.10)",
    "2xl": "0 24px 64px rgba(0,0,0,0.20), 0 12px 24px rgba(0,0,0,0.12)",
  },

  motion: { fast: "120ms", normal: "180ms", slow: "280ms", easing: "cubic-bezier(0.2, 0, 0, 1)" },

  layout: {
    sidebarWidth: "240px", sidebarCollapsedWidth: "56px",
    headerHeight: "52px", pageMaxWidth: "1280px", pagePadding: "1.5rem",
  },

  density: "comfortable",
};

// ---------------------------------------------------------------------------
// Theme Validation
// ---------------------------------------------------------------------------

/** Validation error */
export interface ThemeValidationError {
  path: string;
  message: string;
}

/**
 * Validate a theme manifest for completeness and correctness.
 * Returns an array of errors (empty = valid).
 */
export function validateThemeManifest(manifest: unknown): ThemeValidationError[] {
  const errors: ThemeValidationError[] = [];

  if (!manifest || typeof manifest !== "object") {
    errors.push({ path: "", message: "Manifest bir object olmali." });
    return errors;
  }

  const m = manifest as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ["id", "name", "description", "author", "version"];
  for (const field of requiredStrings) {
    if (typeof m[field] !== "string" || !(m[field] as string).trim()) {
      errors.push({ path: field, message: `"${field}" bos olmayan bir string olmali.` });
    }
  }

  // ID format
  if (typeof m.id === "string" && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(m.id) && m.id.length > 1) {
    errors.push({ path: "id", message: "ID kebab-case formatinda olmali (orn: my-theme)." });
  }

  // Tone array
  if (!Array.isArray(m.tone)) {
    errors.push({ path: "tone", message: "tone bir string dizisi olmali." });
  }

  // Density
  if (!["compact", "comfortable", "spacious"].includes(m.density as string)) {
    errors.push({ path: "density", message: 'density "compact", "comfortable" veya "spacious" olmali.' });
  }

  // Typography
  if (!m.typography || typeof m.typography !== "object") {
    errors.push({ path: "typography", message: "typography objesi zorunlu." });
  } else {
    const t = m.typography as Record<string, unknown>;
    for (const fontKey of ["heading", "body", "mono"]) {
      if (!t[fontKey] || typeof t[fontKey] !== "object") {
        errors.push({ path: `typography.${fontKey}`, message: `${fontKey} font tanimi zorunlu.` });
      } else {
        const font = t[fontKey] as Record<string, unknown>;
        if (typeof font.family !== "string") errors.push({ path: `typography.${fontKey}.family`, message: "family string olmali." });
        if (typeof font.stack !== "string") errors.push({ path: `typography.${fontKey}.stack`, message: "stack string olmali." });
      }
    }
    if (!t.size || typeof t.size !== "object") {
      errors.push({ path: "typography.size", message: "size objesi zorunlu." });
    } else {
      const sizeKeys = ["xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"];
      for (const k of sizeKeys) {
        if (typeof (t.size as Record<string, unknown>)[k] !== "string") {
          errors.push({ path: `typography.size.${k}`, message: `size.${k} string olmali.` });
        }
      }
    }
  }

  // Colors
  if (!m.colors || typeof m.colors !== "object") {
    errors.push({ path: "colors", message: "colors objesi zorunlu." });
  } else {
    const c = m.colors as Record<string, unknown>;
    // Brand scale
    if (!c.brand || typeof c.brand !== "object") {
      errors.push({ path: "colors.brand", message: "brand renk skalasi zorunlu." });
    }
    // Neutral scale
    if (!c.neutral || typeof c.neutral !== "object") {
      errors.push({ path: "colors.neutral", message: "neutral renk skalasi zorunlu." });
    }
    // Semantic colors
    for (const sem of ["success", "warning", "error", "info"]) {
      if (!c[sem] || typeof c[sem] !== "object") {
        errors.push({ path: `colors.${sem}`, message: `${sem} semantik renk objesi zorunlu.` });
      } else {
        const sc = c[sem] as Record<string, unknown>;
        for (const k of ["light", "base", "dark", "text"]) {
          if (typeof sc[k] !== "string") {
            errors.push({ path: `colors.${sem}.${k}`, message: `${sem}.${k} string olmali.` });
          }
        }
      }
    }
    // Surface
    if (!c.surface || typeof c.surface !== "object") {
      errors.push({ path: "colors.surface", message: "surface objesi zorunlu." });
    }
    // Border
    if (!c.border || typeof c.border !== "object") {
      errors.push({ path: "colors.border", message: "border objesi zorunlu." });
    }
  }

  // Spacing
  if (!m.spacing || typeof m.spacing !== "object") {
    errors.push({ path: "spacing", message: "spacing objesi zorunlu." });
  }

  // Radius
  if (!m.radius || typeof m.radius !== "object") {
    errors.push({ path: "radius", message: "radius objesi zorunlu." });
  }

  // Shadow
  if (!m.shadow || typeof m.shadow !== "object") {
    errors.push({ path: "shadow", message: "shadow objesi zorunlu." });
  }

  // Motion
  if (!m.motion || typeof m.motion !== "object") {
    errors.push({ path: "motion", message: "motion objesi zorunlu." });
  }

  // Layout
  if (!m.layout || typeof m.layout !== "object") {
    errors.push({ path: "layout", message: "layout objesi zorunlu." });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Example: Alternative theme for AI reference
// ---------------------------------------------------------------------------

export const EXAMPLE_WARM_EARTH_THEME: ThemeManifest = {
  id: "warm-earth",
  name: "Warm Earth",
  description: "Sicak toprak tonlari ile sakin ve dogal bir admin deneyimi.",
  author: "ai-generated",
  version: "1.0.0",
  tone: ["warm", "natural", "calm", "earthy"],

  typography: {
    heading: {
      family: "DM Sans",
      stack: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    body: {
      family: "DM Sans",
      stack: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    mono: {
      family: "JetBrains Mono",
      stack: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    },
    size: {
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.875rem",
      lg: "1rem", xl: "1.125rem", "2xl": "1.375rem", "3xl": "1.75rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.625 },
  },

  colors: {
    brand: {
      50: "#fdf8f0", 100: "#faebd7", 200: "#f5d5a8", 300: "#edb96a",
      400: "#e5a03c", 500: "#d4882a", 600: "#b87022", 700: "#96581c",
      800: "#7a4818", 900: "#5e3714",
    },
    neutral: {
      0: "#ffffff", 25: "#fdfcfa", 50: "#faf8f5", 100: "#f3f0eb",
      200: "#e8e3dc", 300: "#d9d2c9", 400: "#c4bbb0", 500: "#a9a095",
      600: "#8a8177", 700: "#5c544c", 800: "#3d3731", 900: "#252119",
      950: "#171411",
    },
    success: { light: "#e6f5e8", base: "#4caf50", dark: "#388e3c", text: "#1b5e20" },
    warning: { light: "#fff8e1", base: "#ff9800", dark: "#ef6c00", text: "#7c4a00" },
    error: { light: "#fce4ec", base: "#ef5350", dark: "#c62828", text: "#921515" },
    info: { light: "#e3f2fd", base: "#42a5f5", dark: "#1565c0", text: "#0d47a1" },
    surface: {
      page: "#faf8f5", card: "#ffffff", elevated: "#ffffff",
      inset: "#f3f0eb", sidebar: "#252119", sidebarHover: "#3d3731",
      sidebarActive: "#5c544c",
    },
    border: { subtle: "#e8e3dc", default: "#d9d2c9", strong: "#c4bbb0" },
    focus: "#d4882a",
    chart: ["#d4882a", "#4caf50", "#42a5f5", "#ef5350", "#7c3aed", "#e64980"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "6px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(37,33,25,0.05)",
    sm: "0 1px 3px rgba(37,33,25,0.07), 0 1px 2px rgba(37,33,25,0.04)",
    md: "0 4px 6px -1px rgba(37,33,25,0.07), 0 2px 4px -2px rgba(37,33,25,0.04)",
    lg: "0 10px 15px -3px rgba(37,33,25,0.08), 0 4px 6px -4px rgba(37,33,25,0.04)",
    xl: "0 16px 48px rgba(37,33,25,0.18), 0 8px 16px rgba(37,33,25,0.12)",
    "2xl": "0 24px 64px rgba(37,33,25,0.22), 0 12px 24px rgba(37,33,25,0.14)",
  },

  motion: { fast: "120ms", normal: "200ms", slow: "300ms", easing: "cubic-bezier(0.2, 0, 0, 1)" },

  layout: {
    sidebarWidth: "240px", sidebarCollapsedWidth: "56px",
    headerHeight: "52px", pageMaxWidth: "1280px", pagePadding: "1.5rem",
  },

  density: "comfortable",
};
