/**
 * ContentHub Design System — M24
 *
 * Single source of truth for all visual tokens.
 * Every component should import from here instead of hardcoding values.
 */

// ---------------------------------------------------------------------------
// Color Palette — "Obsidian Slate" theme
// ---------------------------------------------------------------------------

export const colors = {
  // Primary brand
  brand: {
    50: "#f0f4ff",
    100: "#dbe4ff",
    200: "#bac8ff",
    300: "#91a7ff",
    400: "#748ffc",
    500: "#5c7cfa",
    600: "#4c6ef5",
    700: "#4263eb",
    800: "#3b5bdb",
    900: "#364fc7",
  },

  // Neutral — the backbone
  neutral: {
    0: "#ffffff",
    25: "#fcfcfd",
    50: "#f8f9fb",
    100: "#f1f3f5",
    200: "#e9ecef",
    300: "#dee2e6",
    400: "#ced4da",
    500: "#adb5bd",
    600: "#868e96",
    700: "#495057",
    800: "#343a40",
    900: "#212529",
    950: "#141517",
  },

  // Semantic
  success: { light: "#d3f9d8", base: "#37b24d", dark: "#2b8a3e", text: "#1b5e20" },
  warning: { light: "#fff3bf", base: "#f59f00", dark: "#e67700", text: "#7c4a00" },
  error: { light: "#ffe3e3", base: "#f03e3e", dark: "#c92a2a", text: "#921515" },
  info: { light: "#d0ebff", base: "#339af0", dark: "#1c7ed6", text: "#0c4a7e" },

  // Surface accents
  surface: {
    page: "#f8f9fb",
    card: "#ffffff",
    elevated: "#ffffff",
    inset: "#f1f3f5",
    sidebar: "#1a1b1e",
    sidebarHover: "#25262b",
    sidebarActive: "#2c2e33",
  },

  // Borders
  border: {
    subtle: "#e9ecef",
    default: "#dee2e6",
    strong: "#ced4da",
  },
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const typography = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  monoFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",

  size: {
    xs: "0.6875rem",   // 11px
    sm: "0.75rem",     // 12px
    base: "0.8125rem", // 13px
    md: "0.875rem",    // 14px
    lg: "1rem",        // 16px
    xl: "1.125rem",    // 18px
    "2xl": "1.375rem", // 22px
    "3xl": "1.75rem",  // 28px
  },

  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing & Sizing
// ---------------------------------------------------------------------------

export const spacing = {
  0: "0",
  1: "0.25rem",  // 4px
  2: "0.5rem",   // 8px
  3: "0.75rem",  // 12px
  4: "1rem",     // 16px
  5: "1.25rem",  // 20px
  6: "1.5rem",   // 24px
  8: "2rem",     // 32px
  10: "2.5rem",  // 40px
  12: "3rem",    // 48px
  16: "4rem",    // 64px
} as const;

export const radius = {
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "12px",
  full: "9999px",
} as const;

export const shadow = {
  xs: "0 1px 2px rgba(0,0,0,0.04)",
  sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  md: "0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.04)",
} as const;

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export const transition = {
  fast: "120ms ease",
  normal: "180ms ease",
  slow: "280ms ease",
} as const;

// ---------------------------------------------------------------------------
// Z-index layers
// ---------------------------------------------------------------------------

export const zIndex = {
  sidebar: 100,
  header: 110,
  dropdown: 200,
  modal: 300,
  toast: 400,
} as const;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

export const layout = {
  sidebarWidth: "240px",
  sidebarCollapsedWidth: "56px",
  headerHeight: "52px",
  pageMaxWidth: "1280px",
  pagePadding: "1.5rem",
} as const;

// ---------------------------------------------------------------------------
// Status badge styles — centralized for all subsystems
// ---------------------------------------------------------------------------

export type StatusVariant =
  | "success" | "warning" | "error" | "info" | "neutral"
  | "active" | "inactive" | "draft" | "ready" | "failed"
  | "processing" | "queued" | "running" | "completed" | "cancelled"
  | "published" | "pending_review" | "approved" | "review_rejected"
  | "scheduled" | "publishing" | "retrying" | "waiting" | "skipped";

export function statusStyle(variant: StatusVariant | string): { background: string; color: string } {
  switch (variant) {
    case "success":
    case "completed":
    case "published":
    case "ready":
    case "active":
    case "approved":
      return { background: colors.success.light, color: colors.success.text };

    case "warning":
    case "processing":
    case "running":
    case "publishing":
    case "retrying":
    case "scheduled":
    case "waiting":
      return { background: colors.warning.light, color: colors.warning.text };

    case "error":
    case "failed":
    case "review_rejected":
      return { background: colors.error.light, color: colors.error.text };

    case "info":
    case "queued":
    case "pending_review":
      return { background: colors.info.light, color: colors.info.text };

    case "neutral":
    case "inactive":
    case "draft":
    case "cancelled":
    case "skipped":
      return { background: colors.neutral[100], color: colors.neutral[700] };

    default:
      return { background: colors.neutral[100], color: colors.neutral[700] };
  }
}
