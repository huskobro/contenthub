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
    /** Sidebar text colors — ensure readable on sidebar background */
    sidebarText?: string;
    sidebarTextMuted?: string;
    sidebarTextActive?: string;
    sidebarSection?: string;
    sidebarBorder?: string;
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

/** Layout mode — determines which layout shell to use */
export type ThemeLayoutMode = "classic" | "horizon";

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
  /** Layout mode — "classic" uses traditional sidebar+header, "horizon" uses icon rail+context panel */
  layoutMode?: ThemeLayoutMode;
}

// ---------------------------------------------------------------------------
// Default Theme — "Obsidian Slate"
// ---------------------------------------------------------------------------

export const DEFAULT_THEME: ThemeManifest = {
  id: "obsidian-slate",
  name: "Obsidian Slate",
  description: "ContentHub'un varsayilan temasi. Sinematik derinlik, katmanli yuzeyler ve rafine tipografi ile premium uretim stüdyosu hissi.",
  author: "system",
  version: "2.0.0",
  tone: ["cinematic", "refined", "premium", "deep"],

  typography: {
    heading: {
      family: "Instrument Sans",
      stack: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Plus Jakarta Sans",
      stack: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "Geist Mono",
      stack: "'Geist Mono', 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    },
    size: {
      xs: "0.6875rem",
      sm: "0.75rem",
      base: "0.8125rem",
      md: "0.875rem",
      lg: "1rem",
      xl: "1.15rem",
      "2xl": "1.5rem",
      "3xl": "2.125rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.625 },
    letterSpacing: { tight: "-0.025em", normal: "-0.005em", wide: "0.08em" },
  },

  colors: {
    brand: {
      50: "#edf1ff", 100: "#dde4ff", 200: "#c2cdff", 300: "#96a8ff",
      400: "#6b82ff", 500: "#4f68f7", 600: "#3b50e6", 700: "#3044cc",
      800: "#2939a8", 900: "#273489",
    },
    neutral: {
      0: "#ffffff", 25: "#fafbfc", 50: "#f4f6f9", 100: "#ebeef3",
      200: "#dfe3ea", 300: "#cdd3dc", 400: "#b0b8c7", 500: "#8b95a6",
      600: "#6b7688", 700: "#454d5c", 800: "#2e3440", 900: "#1a1f2b",
      950: "#0f1219",
    },
    success: { light: "#d8f5de", base: "#34b849", dark: "#28913a", text: "#165a22" },
    warning: { light: "#fff2cc", base: "#f0a000", dark: "#d18a00", text: "#6e4800" },
    error: { light: "#fde2e2", base: "#e53e3e", dark: "#c02424", text: "#7a1414" },
    info: { light: "#dbeafe", base: "#3b82f6", dark: "#1d6ce0", text: "#0f4c91" },
    surface: {
      page: "#f0f2f7", card: "#ffffff", elevated: "#ffffff",
      inset: "#e8ebf2", sidebar: "#111520", sidebarHover: "#1b2030",
      sidebarActive: "#252b3d",
      sidebarText: "#ebeef3", sidebarTextMuted: "#6b7688",
      sidebarTextActive: "#96a8ff", sidebarSection: "#4f68f7",
      sidebarBorder: "#1e2538",
    },
    border: { subtle: "#e2e6ee", default: "#d0d5e0", strong: "#b5bcc9" },
    focus: "#3b50e6",
    chart: ["#3b50e6", "#34b849", "#f0a000", "#e53e3e", "#8b5cf6", "#ec4899", "#06b6d4"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "6px", md: "10px", lg: "14px", xl: "18px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(15,18,25,0.05), 0 0 0 1px rgba(15,18,25,0.03)",
    sm: "0 2px 6px rgba(15,18,25,0.06), 0 1px 2px rgba(15,18,25,0.04)",
    md: "0 4px 16px rgba(15,18,25,0.08), 0 2px 4px rgba(15,18,25,0.04)",
    lg: "0 8px 30px rgba(15,18,25,0.10), 0 4px 8px rgba(15,18,25,0.06)",
    xl: "0 16px 50px rgba(15,18,25,0.14), 0 8px 16px rgba(15,18,25,0.08)",
    "2xl": "0 24px 70px rgba(15,18,25,0.18), 0 12px 24px rgba(15,18,25,0.10)",
  },

  motion: { fast: "100ms", normal: "200ms", slow: "320ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },

  layout: {
    sidebarWidth: "248px", sidebarCollapsedWidth: "56px",
    headerHeight: "54px", pageMaxWidth: "1320px", pagePadding: "1.75rem",
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

// ---------------------------------------------------------------------------
// Built-in Theme: "Void Terminal" — Dark-first control room aesthetic
// ---------------------------------------------------------------------------

export const VOID_TERMINAL_THEME: ThemeManifest = {
  id: "void-terminal",
  name: "Void Terminal",
  description: "Koyu, keskin, kontrol odasi estetiginde bir arayuz. Bloomberg Terminal + Linear App ilhamli, neon vurgularla.",
  author: "system",
  version: "1.0.0",
  tone: ["dark", "sharp", "terminal", "editorial", "control-room"],

  typography: {
    heading: {
      family: "Outfit",
      stack: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Outfit",
      stack: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "IBM Plex Mono",
      stack: "'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace",
    },
    size: {
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.875rem",
      lg: "1rem", xl: "1.125rem", "2xl": "1.5rem", "3xl": "2.25rem",
    },
    weight: { normal: 300, medium: 400, semibold: 500, bold: 600 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.65 },
    letterSpacing: { tight: "-0.03em", normal: "-0.01em", wide: "0.12em" },
  },

  colors: {
    brand: {
      50: "#0d1f12", 100: "#0f2d16", 200: "#134d22", 300: "#1a7a35",
      400: "#22a84a", 500: "#2dd55b", 600: "#4ae775", 700: "#7cf0a0",
      800: "#adf7c5", 900: "#d8fce4",
    },
    neutral: {
      0: "#0a0a0c", 25: "#0e0e11", 50: "#121216", 100: "#18181d",
      200: "#1f2027", 300: "#2a2b33", 400: "#3d3e4a", 500: "#555668",
      600: "#70728a", 700: "#9496b0", 800: "#b8bad4", 900: "#dddff0",
      950: "#f0f1fa",
    },
    success: { light: "#0d2818", base: "#2dd55b", dark: "#22a84a", text: "#7cf0a0" },
    warning: { light: "#2a1f08", base: "#ffb224", dark: "#f5a623", text: "#ffd580" },
    error: { light: "#2d0c0e", base: "#f5424e", dark: "#e5383b", text: "#ff8a8f" },
    info: { light: "#0c1929", base: "#3b82f6", dark: "#2563eb", text: "#93bbfd" },
    surface: {
      page: "#0a0a0c", card: "#121216", elevated: "#18181d",
      inset: "#0e0e11", sidebar: "#0a0a0c", sidebarHover: "#18181d",
      sidebarActive: "#1f2027",
      sidebarText: "#dddff0", sidebarTextMuted: "#70728a",
      sidebarTextActive: "#7cf0a0", sidebarSection: "#555668",
      sidebarBorder: "#1f2027",
    },
    border: { subtle: "#1f2027", default: "#2a2b33", strong: "#3d3e4a" },
    focus: "#2dd55b",
    chart: ["#2dd55b", "#3b82f6", "#ffb224", "#f5424e", "#a855f7", "#ec4899", "#06b6d4"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "3px", md: "4px", lg: "6px", xl: "8px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(0,0,0,0.4), 0 0 1px rgba(45,213,91,0.05)",
    sm: "0 2px 4px rgba(0,0,0,0.5), 0 0 1px rgba(45,213,91,0.08)",
    md: "0 4px 12px rgba(0,0,0,0.6), 0 0 2px rgba(45,213,91,0.06)",
    lg: "0 8px 24px rgba(0,0,0,0.7), 0 0 4px rgba(45,213,91,0.05)",
    xl: "0 16px 48px rgba(0,0,0,0.8), 0 0 8px rgba(45,213,91,0.04)",
    "2xl": "0 24px 64px rgba(0,0,0,0.9), 0 0 16px rgba(45,213,91,0.06)",
  },

  motion: { fast: "80ms", normal: "140ms", slow: "220ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },

  layout: {
    sidebarWidth: "220px", sidebarCollapsedWidth: "52px",
    headerHeight: "44px", pageMaxWidth: "1400px", pagePadding: "1.5rem",
  },

  density: "compact",
};

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
      stack: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "DM Sans",
      stack: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "Geist Mono",
      stack: "'Geist Mono', 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
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
      sidebarText: "#f3f0eb", sidebarTextMuted: "#a9a095",
      sidebarTextActive: "#edb96a", sidebarSection: "#8a8177",
      sidebarBorder: "#3d3731",
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
