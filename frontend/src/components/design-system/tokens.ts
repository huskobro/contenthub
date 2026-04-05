/**
 * ContentHub Design System — Tokens (M24 + Wave 1 Final)
 *
 * Single source of truth for all visual tokens.
 * Every component should import from here instead of hardcoding values.
 *
 * These values are derived from the active theme via themeContract.ts.
 * When the theme changes, the theme engine applies CSS variables to :root
 * and these static exports serve as the default (Obsidian Slate) values.
 *
 * For runtime theme-awareness in inline styles, components use these tokens.
 * The theme engine ensures CSS variables match, so both approaches stay in sync.
 */

import { DEFAULT_THEME } from "./themeContract";

// ---------------------------------------------------------------------------
// Color Palette — derived from active theme (default: "Obsidian Slate")
// ---------------------------------------------------------------------------

export const colors = {
  // Primary brand
  brand: { ...DEFAULT_THEME.colors.brand },

  // Neutral — the backbone
  neutral: { ...DEFAULT_THEME.colors.neutral },

  // Semantic
  success: { ...DEFAULT_THEME.colors.success },
  warning: { ...DEFAULT_THEME.colors.warning },
  error: { ...DEFAULT_THEME.colors.error },
  info: { ...DEFAULT_THEME.colors.info },

  // Surface accents
  surface: { ...DEFAULT_THEME.colors.surface },

  // Borders
  border: { ...DEFAULT_THEME.colors.border },

  // Focus
  focus: DEFAULT_THEME.colors.focus,
} as const;

// ---------------------------------------------------------------------------
// Typography — derived from active theme
// ---------------------------------------------------------------------------

export const typography = {
  fontFamily: DEFAULT_THEME.typography.body.stack,
  headingFamily: DEFAULT_THEME.typography.heading.stack,
  monoFamily: DEFAULT_THEME.typography.mono.stack,

  size: { ...DEFAULT_THEME.typography.size },

  weight: { ...DEFAULT_THEME.typography.weight },

  lineHeight: { ...DEFAULT_THEME.typography.lineHeight },
} as const;

// ---------------------------------------------------------------------------
// Spacing & Sizing — derived from active theme
// ---------------------------------------------------------------------------

export const spacing = { ...DEFAULT_THEME.spacing } as const;

export const radius = { ...DEFAULT_THEME.radius } as const;

export const shadow = { ...DEFAULT_THEME.shadow } as const;

// ---------------------------------------------------------------------------
// Transitions — derived from active theme
// ---------------------------------------------------------------------------

export const transition = {
  fast: `${DEFAULT_THEME.motion.fast} ${DEFAULT_THEME.motion.easing}`,
  normal: `${DEFAULT_THEME.motion.normal} ${DEFAULT_THEME.motion.easing}`,
  slow: `${DEFAULT_THEME.motion.slow} ${DEFAULT_THEME.motion.easing}`,
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
// Layout constants — derived from active theme
// ---------------------------------------------------------------------------

export const layout = { ...DEFAULT_THEME.layout } as const;

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
