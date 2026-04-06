/**
 * Horizon Theme Collection — 4 themes for the Horizon layout mode
 *
 * Horizon is a completely different UI design language:
 * - Icon rail (48px) + collapsible context panel (240px) instead of traditional sidebar
 * - No header bar — brand + search lives in context panel
 * - Monochromatic layered surfaces — same color family at 4-5 depth levels
 * - Heavy weight contrast in typography (thin body + bold headings)
 * - Spring-based animations with overshoot easing
 *
 * All themes use layoutMode: "horizon" which tells the router
 * to render HorizonLayout instead of the classic AdminLayout/UserLayout.
 *
 * 1. Horizon Chalk — Light, paper-white, soft gray layers, blue accent
 * 2. Horizon Obsidian — Dark, black layers, neon green accent (terminal)
 * 3. Horizon Sand — Warm, sand/dune tones, amber accent
 * 4. Horizon Midnight — Deep navy layers, gold accent
 */

import type { ThemeManifest } from "./themeContract";

// ---------------------------------------------------------------------------
// 1. Horizon Chalk — Clean paper-white with blue accent
// ---------------------------------------------------------------------------

export const HORIZON_CHALK_THEME: ThemeManifest = {
  id: "horizon-chalk",
  name: "Horizon Chalk",
  description: "Kagit beyazi yuzeyler, yumusak gri katmanlar, mavi vurgu. Horizon layout ile temiz ve modern.",
  author: "system",
  version: "1.0.0",
  tone: ["light", "clean", "minimal", "chalk", "modern"],
  layoutMode: "horizon",

  typography: {
    heading: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
      xl: "1.25rem",
      "2xl": "1.625rem",
      "3xl": "2.25rem",
    },
    weight: { normal: 300, medium: 450, semibold: 600, bold: 800 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.65 },
    letterSpacing: { tight: "-0.025em", normal: "-0.01em", wide: "0.08em" },
  },

  colors: {
    brand: {
      50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
      400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
      800: "#1e40af", 900: "#1e3a8a",
    },
    neutral: {
      0: "#ffffff", 25: "#fdfdfd", 50: "#fafafa", 100: "#f5f5f5",
      200: "#e5e5e5", 300: "#d4d4d4", 400: "#a3a3a3", 500: "#737373",
      600: "#525252", 700: "#404040", 800: "#262626", 900: "#171717",
      950: "#0a0a0a",
    },
    success: { light: "#f0fdf4", base: "#22c55e", dark: "#16a34a", text: "#15803d" },
    warning: { light: "#fffbeb", base: "#f59e0b", dark: "#d97706", text: "#a16207" },
    error: { light: "#fef2f2", base: "#ef4444", dark: "#dc2626", text: "#b91c1c" },
    info: { light: "#eff6ff", base: "#3b82f6", dark: "#2563eb", text: "#1d4ed8" },
    surface: {
      page: "#fafafa",
      card: "#ffffff",
      elevated: "#ffffff",
      inset: "#f5f5f5",
      sidebar: "#171717",
      sidebarHover: "#262626",
      sidebarActive: "#404040",
      sidebarText: "#e5e5e5",
      sidebarTextMuted: "#737373",
      sidebarTextActive: "#93c5fd",
      sidebarSection: "#525252",
      sidebarBorder: "#262626",
    },
    border: { subtle: "#f0f0f0", default: "#e5e5e5", strong: "#d4d4d4" },
    focus: "#3b82f6",
    chart: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"],
  },

  spacing: {
    0: "0", 1: "0.125rem", 2: "0.25rem", 3: "0.5rem", 4: "0.75rem",
    5: "1rem", 6: "1.25rem", 8: "1.5rem", 10: "2rem", 12: "2.5rem", 16: "3.2rem",
  },

  radius: { sm: "8px", md: "12px", lg: "16px", xl: "20px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(0,0,0,0.04)",
    sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    md: "0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
    lg: "0 10px 20px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)",
    xl: "0 20px 40px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)",
    "2xl": "0 32px 64px rgba(0,0,0,0.14), 0 16px 32px rgba(0,0,0,0.08)",
  },

  motion: { fast: "120ms", normal: "200ms", slow: "350ms", easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },

  layout: {
    sidebarWidth: "288px",
    sidebarCollapsedWidth: "48px",
    headerHeight: "0px",
    pageMaxWidth: "1320px",
    pagePadding: "1.25rem",
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 2. Horizon Obsidian — Deep black with neon green terminal accent
// ---------------------------------------------------------------------------

export const HORIZON_OBSIDIAN_THEME: ThemeManifest = {
  id: "horizon-obsidian",
  name: "Horizon Obsidian",
  description: "Derin siyah katmanlar, neon yesil terminal vurgusu. Horizon layout ile kontrol odasi estetiği.",
  author: "system",
  version: "1.0.0",
  tone: ["dark", "terminal", "obsidian", "neon", "control-room"],
  layoutMode: "horizon",

  typography: {
    heading: {
      family: "Space Grotesk",
      stack: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "JetBrains Mono",
      stack: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    },
    size: {
      xs: "0.625rem",
      sm: "0.6875rem",
      base: "0.75rem",
      md: "0.8125rem",
      lg: "0.9375rem",
      xl: "1.125rem",
      "2xl": "1.5rem",
      "3xl": "2rem",
    },
    weight: { normal: 300, medium: 400, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.15, normal: 1.45, relaxed: 1.6 },
    letterSpacing: { tight: "-0.03em", normal: "-0.01em", wide: "0.12em" },
  },

  colors: {
    brand: {
      50: "#0d1f12", 100: "#0f2d16", 200: "#134d22", 300: "#1a7a35",
      400: "#22a84a", 500: "#2dd55b", 600: "#4ae775", 700: "#7cf0a0",
      800: "#adf7c5", 900: "#d8fce4",
    },
    neutral: {
      0: "#09090b", 25: "#0c0c0f", 50: "#111114", 100: "#18181b",
      200: "#202024", 300: "#2a2a30", 400: "#3f3f46", 500: "#52525b",
      600: "#71717a", 700: "#a1a1aa", 800: "#d4d4d8", 900: "#e4e4e7",
      950: "#fafafa",
    },
    success: { light: "#0d2818", base: "#2dd55b", dark: "#22a84a", text: "#7cf0a0" },
    warning: { light: "#2a1f08", base: "#fbbf24", dark: "#f59e0b", text: "#fde68a" },
    error: { light: "#2d0c0e", base: "#f5424e", dark: "#e5383b", text: "#fca5a5" },
    info: { light: "#0c1929", base: "#60a5fa", dark: "#3b82f6", text: "#93c5fd" },
    surface: {
      page: "#09090b",
      card: "#111114",
      elevated: "#18181b",
      inset: "#0c0c0f",
      sidebar: "#09090b",
      sidebarHover: "#18181b",
      sidebarActive: "#202024",
      sidebarText: "#e4e4e7",
      sidebarTextMuted: "#71717a",
      sidebarTextActive: "#7cf0a0",
      sidebarSection: "#52525b",
      sidebarBorder: "#202024",
    },
    border: { subtle: "#202024", default: "#2a2a30", strong: "#3f3f46" },
    focus: "#2dd55b",
    chart: ["#2dd55b", "#60a5fa", "#fbbf24", "#f5424e", "#a78bfa", "#ec4899", "#06b6d4"],
  },

  spacing: {
    0: "0", 1: "0.2rem", 2: "0.4rem", 3: "0.6rem", 4: "0.8rem",
    5: "1rem", 6: "1.2rem", 8: "1.6rem", 10: "2rem", 12: "2.4rem", 16: "3.2rem",
  },

  radius: { sm: "4px", md: "6px", lg: "10px", xl: "14px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(0,0,0,0.5), 0 0 1px rgba(45,213,91,0.04)",
    sm: "0 2px 4px rgba(0,0,0,0.6), 0 0 2px rgba(45,213,91,0.06)",
    md: "0 4px 12px rgba(0,0,0,0.6), 0 0 4px rgba(45,213,91,0.05)",
    lg: "0 8px 24px rgba(0,0,0,0.7), 0 0 8px rgba(45,213,91,0.04)",
    xl: "0 16px 48px rgba(0,0,0,0.8), 0 0 12px rgba(45,213,91,0.06)",
    "2xl": "0 24px 64px rgba(0,0,0,0.9), 0 0 20px rgba(45,213,91,0.08)",
  },

  motion: { fast: "80ms", normal: "140ms", slow: "240ms", easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },

  layout: {
    sidebarWidth: "272px",
    sidebarCollapsedWidth: "48px",
    headerHeight: "0px",
    pageMaxWidth: "1440px",
    pagePadding: "1.25rem",
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 3. Horizon Sand — Warm dune tones with amber accent
// ---------------------------------------------------------------------------

export const HORIZON_SAND_THEME: ThemeManifest = {
  id: "horizon-sand",
  name: "Horizon Sand",
  description: "Sicak kum tonlari, dune estetiği, amber vurgu. Horizon layout ile sakin ve dogal.",
  author: "system",
  version: "1.0.0",
  tone: ["warm", "sand", "dune", "amber", "natural"],
  layoutMode: "horizon",

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
      family: "JetBrains Mono",
      stack: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    },
    size: {
      xs: "0.6875rem",
      sm: "0.75rem",
      base: "0.8125rem",
      md: "0.875rem",
      lg: "1rem",
      xl: "1.1875rem",
      "2xl": "1.5rem",
      "3xl": "2.125rem",
    },
    weight: { normal: 300, medium: 450, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.55, relaxed: 1.7 },
    letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.06em" },
  },

  colors: {
    brand: {
      50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d",
      400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309",
      800: "#92400e", 900: "#78350f",
    },
    neutral: {
      0: "#fefdfb", 25: "#fcfaf6", 50: "#faf7f2", 100: "#f5f0e8",
      200: "#ebe4d8", 300: "#ddd4c4", 400: "#c2b8a5", 500: "#a09788",
      600: "#807768", 700: "#5c5448", 800: "#3b352c", 900: "#211e18",
      950: "#14120e",
    },
    success: { light: "#ecfdf5", base: "#22c55e", dark: "#16a34a", text: "#15803d" },
    warning: { light: "#fffbeb", base: "#f59e0b", dark: "#d97706", text: "#a16207" },
    error: { light: "#fef2f2", base: "#ef4444", dark: "#dc2626", text: "#b91c1c" },
    info: { light: "#eff6ff", base: "#3b82f6", dark: "#2563eb", text: "#1d4ed8" },
    surface: {
      page: "#faf7f2",
      card: "#fefdfb",
      elevated: "#ffffff",
      inset: "#f5f0e8",
      sidebar: "#211e18",
      sidebarHover: "#3b352c",
      sidebarActive: "#5c5448",
      sidebarText: "#f5f0e8",
      sidebarTextMuted: "#a09788",
      sidebarTextActive: "#fcd34d",
      sidebarSection: "#807768",
      sidebarBorder: "#3b352c",
    },
    border: { subtle: "#ebe4d8", default: "#ddd4c4", strong: "#c2b8a5" },
    focus: "#f59e0b",
    chart: ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"],
  },

  spacing: {
    0: "0", 1: "0.125rem", 2: "0.25rem", 3: "0.5rem", 4: "0.75rem",
    5: "1rem", 6: "1.25rem", 8: "1.5rem", 10: "2rem", 12: "2.5rem", 16: "3.2rem",
  },

  radius: { sm: "8px", md: "12px", lg: "16px", xl: "20px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(33,30,24,0.04)",
    sm: "0 1px 3px rgba(33,30,24,0.06), 0 1px 2px rgba(33,30,24,0.04)",
    md: "0 4px 8px rgba(33,30,24,0.06), 0 2px 4px rgba(33,30,24,0.04)",
    lg: "0 10px 20px rgba(33,30,24,0.08), 0 4px 8px rgba(33,30,24,0.04)",
    xl: "0 20px 40px rgba(33,30,24,0.10), 0 8px 16px rgba(33,30,24,0.06)",
    "2xl": "0 32px 64px rgba(33,30,24,0.14), 0 16px 32px rgba(33,30,24,0.08)",
  },

  motion: { fast: "140ms", normal: "240ms", slow: "400ms", easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },

  layout: {
    sidebarWidth: "280px",
    sidebarCollapsedWidth: "48px",
    headerHeight: "0px",
    pageMaxWidth: "1280px",
    pagePadding: "1.25rem",
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 4. Horizon Midnight — Deep navy layers with gold accent
// ---------------------------------------------------------------------------

export const HORIZON_MIDNIGHT_THEME: ThemeManifest = {
  id: "horizon-midnight",
  name: "Horizon Midnight",
  description: "Derin lacivert katmanlar, altin vurgu. Horizon layout ile premium gece estetiği.",
  author: "system",
  version: "1.0.0",
  tone: ["dark", "navy", "midnight", "gold", "premium"],
  layoutMode: "horizon",

  typography: {
    heading: {
      family: "Sora",
      stack: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
      xl: "1.1875rem",
      "2xl": "1.5rem",
      "3xl": "2.125rem",
    },
    weight: { normal: 300, medium: 450, semibold: 600, bold: 800 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.65 },
    letterSpacing: { tight: "-0.025em", normal: "-0.005em", wide: "0.1em" },
  },

  colors: {
    brand: {
      50: "#1a1608", 100: "#2a240d", 200: "#443a15", 300: "#6b5a20",
      400: "#a08930", 500: "#d4b642", 600: "#e5ca5a", 700: "#f0dd7e",
      800: "#f7ecab", 900: "#fdf6d8",
    },
    neutral: {
      0: "#0b0e1a", 25: "#0e1120", 50: "#121628", 100: "#181d32",
      200: "#1f2540", 300: "#2a3052", 400: "#3d4568", 500: "#565e80",
      600: "#747c9c", 700: "#9ca3bc", 800: "#c4c9da", 900: "#e4e6ee",
      950: "#f4f5f8",
    },
    success: { light: "#0d2818", base: "#22c55e", dark: "#16a34a", text: "#86efac" },
    warning: { light: "#2a2008", base: "#fbbf24", dark: "#f59e0b", text: "#fde68a" },
    error: { light: "#2d0c0c", base: "#f87171", dark: "#ef4444", text: "#fecaca" },
    info: { light: "#0c1633", base: "#60a5fa", dark: "#3b82f6", text: "#93c5fd" },
    surface: {
      page: "#0b0e1a",
      card: "#121628",
      elevated: "#181d32",
      inset: "#0e1120",
      sidebar: "#0b0e1a",
      sidebarHover: "#181d32",
      sidebarActive: "#1f2540",
      sidebarText: "#e4e6ee",
      sidebarTextMuted: "#747c9c",
      sidebarTextActive: "#f0dd7e",
      sidebarSection: "#565e80",
      sidebarBorder: "#1f2540",
    },
    border: { subtle: "#1f2540", default: "#2a3052", strong: "#3d4568" },
    focus: "#d4b642",
    chart: ["#d4b642", "#60a5fa", "#22c55e", "#f87171", "#a78bfa", "#ec4899", "#06b6d4"],
  },

  spacing: {
    0: "0", 1: "0.125rem", 2: "0.25rem", 3: "0.5rem", 4: "0.75rem",
    5: "1rem", 6: "1.25rem", 8: "1.5rem", 10: "2rem", 12: "2.5rem", 16: "3.2rem",
  },

  radius: { sm: "6px", md: "10px", lg: "14px", xl: "18px", full: "9999px" },

  shadow: {
    xs: "0 1px 3px rgba(11,14,26,0.5), 0 0 1px rgba(212,182,66,0.04)",
    sm: "0 2px 6px rgba(11,14,26,0.6), 0 0 2px rgba(212,182,66,0.06)",
    md: "0 4px 14px rgba(11,14,26,0.6), 0 0 4px rgba(212,182,66,0.05)",
    lg: "0 8px 28px rgba(11,14,26,0.7), 0 0 8px rgba(212,182,66,0.05)",
    xl: "0 20px 50px rgba(11,14,26,0.8), 0 0 16px rgba(212,182,66,0.06)",
    "2xl": "0 32px 80px rgba(11,14,26,0.9), 0 0 24px rgba(212,182,66,0.08)",
  },

  motion: { fast: "100ms", normal: "180ms", slow: "300ms", easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },

  layout: {
    sidebarWidth: "280px",
    sidebarCollapsedWidth: "48px",
    headerHeight: "0px",
    pageMaxWidth: "1360px",
    pagePadding: "1.25rem",
  },

  density: "compact",
};

/** All Horizon themes */
export const HORIZON_THEMES: ThemeManifest[] = [
  HORIZON_CHALK_THEME,
  HORIZON_OBSIDIAN_THEME,
  HORIZON_SAND_THEME,
  HORIZON_MIDNIGHT_THEME,
];
