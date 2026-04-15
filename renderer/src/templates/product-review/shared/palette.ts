/**
 * product_review_v1 style blueprint — renderer-side palette + motion tokens.
 *
 * DB/system-owned blueprint backend/settings altinda tutuluyor;
 * renderer bu dosyayi fallback/default olarak kullanir.
 * Backend composition executor isterse bu degerleri props'a gecip override eder.
 *
 * Tasarim yonu: "Premium viral" — yuksek kontrast, kuvvetli typography,
 * urun odakli minimal kompozisyon, neon accent disiplini.
 */

export type ProductReviewTone =
  | "electric"    // elektronik / teknoloji (blue-cyan)
  | "crimson"     // fashion / lifestyle (red-magenta)
  | "emerald"     // sustainability / green (green-teal)
  | "gold"        // luxury / premium (amber-gold)
  | "mono";       // default / generic (neutral white-accent)

export interface ProductReviewPalette {
  tone: ProductReviewTone;
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceEdge: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
  positive: string;
  negative: string;
  shadow: string;
}

const PALETTES: Record<ProductReviewTone, ProductReviewPalette> = {
  electric: {
    tone: "electric",
    bg: "#050818",
    bgAlt: "#0a1330",
    surface: "rgba(255,255,255,0.06)",
    surfaceEdge: "rgba(92,167,255,0.35)",
    textPrimary: "#f5f7ff",
    textSecondary: "#a8b4d6",
    accent: "#48b9ff",
    accentSoft: "rgba(72,185,255,0.25)",
    positive: "#4ade80",
    negative: "#f87171",
    shadow: "0 30px 80px rgba(0,0,0,0.55)",
  },
  crimson: {
    tone: "crimson",
    bg: "#140508",
    bgAlt: "#2a080f",
    surface: "rgba(255,255,255,0.07)",
    surfaceEdge: "rgba(255,101,132,0.35)",
    textPrimary: "#fff5f7",
    textSecondary: "#e8b4be",
    accent: "#ff3a6e",
    accentSoft: "rgba(255,58,110,0.22)",
    positive: "#4ade80",
    negative: "#f87171",
    shadow: "0 30px 80px rgba(0,0,0,0.55)",
  },
  emerald: {
    tone: "emerald",
    bg: "#041411",
    bgAlt: "#062a22",
    surface: "rgba(255,255,255,0.06)",
    surfaceEdge: "rgba(56,205,159,0.32)",
    textPrimary: "#f0fff9",
    textSecondary: "#9ed0c0",
    accent: "#2ee8a4",
    accentSoft: "rgba(46,232,164,0.22)",
    positive: "#4ade80",
    negative: "#f87171",
    shadow: "0 30px 80px rgba(0,0,0,0.55)",
  },
  gold: {
    tone: "gold",
    bg: "#0f0904",
    bgAlt: "#241707",
    surface: "rgba(255,255,255,0.05)",
    surfaceEdge: "rgba(255,193,90,0.35)",
    textPrimary: "#fff9ed",
    textSecondary: "#d9c097",
    accent: "#ffc15e",
    accentSoft: "rgba(255,193,94,0.22)",
    positive: "#4ade80",
    negative: "#f87171",
    shadow: "0 30px 80px rgba(0,0,0,0.6)",
  },
  mono: {
    tone: "mono",
    bg: "#0a0a0a",
    bgAlt: "#141414",
    surface: "rgba(255,255,255,0.06)",
    surfaceEdge: "rgba(255,255,255,0.25)",
    textPrimary: "#ffffff",
    textSecondary: "#b8b8b8",
    accent: "#ffffff",
    accentSoft: "rgba(255,255,255,0.15)",
    positive: "#4ade80",
    negative: "#f87171",
    shadow: "0 30px 80px rgba(0,0,0,0.55)",
  },
};

export function resolvePalette(
  tone: ProductReviewTone | string | null | undefined,
): ProductReviewPalette {
  if (!tone) return PALETTES.mono;
  return PALETTES[tone as ProductReviewTone] ?? PALETTES.mono;
}

// Motion tokens — tum sahnelerde ayni dil korunsun
export const MOTION = {
  enterDamping: 12,
  enterMass: 0.7,
  easeOutStrong: [0.16, 1, 0.3, 1] as const,
  heroFloatAmplitude: 8,       // px
  heroFloatPeriod: 120,        // frames
  sceneEnterFrames: 10,
  sceneExitFrames: 8,
};

export const TYPOGRAPHY = {
  display: "'Inter', 'SF Pro Display', 'Helvetica Neue', sans-serif",
  body: "'Inter', 'SF Pro Text', 'Helvetica Neue', sans-serif",
  mono: "'JetBrains Mono', 'Menlo', monospace",
};
