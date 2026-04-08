/**
 * StudioBackground — ContentHub haber bülteni arka planı.
 *
 * bulletinStyle prop'una göre kategori rengini seçer.
 * categoryStyleMapping prop'u varsa renk paletini dinamik olarak override eder
 * (admin panelden ayarlanabilir).
 *
 * Animated grid + merkezi ışık dalgası + scanline glow + vignette.
 *
 * M43: categoryStyleMapping desteği — hardcoded palette yerine setting'den gelen
 * renk tablosu kullanılabilir. Mapping yoksa veya stil bulunamazsa dahili
 * fallback palette kullanılır.
 */

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// ── Tip tanımı ────────────────────────────────────────────────────────────────

export type BulletinStyle =
  | "breaking"
  | "tech"
  | "corporate"
  | "sport"
  | "finance"
  | "weather"
  | "science"
  | "entertainment"
  | "dark";

// ── Fallback Palette (setting yoksa veya stil bulunamazsa) ───────────────────

interface StylePalette { bg: string; grid: string; accent: string; }

const FALLBACK_PALETTES: Record<BulletinStyle, StylePalette> = {
  breaking:      { bg: "#0A0A0A", grid: "rgba(220,38,38,0.07)",   accent: "#DC2626" },
  tech:          { bg: "#0D1B2A", grid: "rgba(0,229,255,0.07)",   accent: "#00E5FF" },
  corporate:     { bg: "#0A1628", grid: "rgba(37,99,235,0.07)",   accent: "#2563EB" },
  sport:         { bg: "#051A10", grid: "rgba(16,185,129,0.07)",  accent: "#10B981" },
  finance:       { bg: "#1A1405", grid: "rgba(245,158,11,0.07)",  accent: "#F59E0B" },
  weather:       { bg: "#0C1F3D", grid: "rgba(56,189,248,0.07)",  accent: "#38BDF8" },
  science:       { bg: "#0F0B1E", grid: "rgba(139,92,246,0.07)",  accent: "#8B5CF6" },
  entertainment: { bg: "#1A0515", grid: "rgba(236,72,153,0.07)",  accent: "#EC4899" },
  dark:          { bg: "#000000", grid: "rgba(148,163,184,0.07)", accent: "#94A3B8" },
};

// ── Palette resolver ─────────────────────────────────────────────────────────

export interface CategoryStyleEntry {
  accent: string;
  bg: string;
  grid: string;
  label_tr?: string;
  label_en?: string;
}

export type CategoryStyleMapping = Record<string, CategoryStyleEntry>;

function resolvePalette(
  style: BulletinStyle,
  mapping?: CategoryStyleMapping | null,
): StylePalette {
  // Setting'den gelen mapping varsa ve stil bulunuyorsa onu kullan
  if (mapping && mapping[style]) {
    const entry = mapping[style];
    return {
      bg: entry.bg ?? FALLBACK_PALETTES[style]?.bg ?? "#000000",
      grid: entry.grid ?? FALLBACK_PALETTES[style]?.grid ?? "rgba(255,255,255,0.05)",
      accent: entry.accent ?? FALLBACK_PALETTES[style]?.accent ?? "#FFFFFF",
    };
  }
  // Fallback: dahili palette
  return FALLBACK_PALETTES[style] ?? FALLBACK_PALETTES.breaking;
}

// ── Bileşen ────────────────────────────────────────────────────────────────────

interface Props {
  style?: BulletinStyle;
  /** M43: Admin panelden gelen kategori renk tablosu. Yoksa fallback palette kullanılır. */
  categoryStyleMapping?: CategoryStyleMapping | null;
}

export const StudioBackground: React.FC<Props> = ({
  style = "breaking",
  categoryStyleMapping,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const palette = resolvePalette(style, categoryStyleMapping);

  // Merkezi ışık dalgası: 3 saniyelik sin döngüsü (180 frame @ 60fps)
  const pulseOpacity = interpolate(
    Math.sin((frame / 180) * Math.PI * 2),
    [-1, 1],
    [0.25, 0.65],
  );

  // Scanline glow animasyonu — yavaş dikey kayma
  const scanlineY = interpolate(
    frame % 360,
    [0, 360],
    [0, height],
  );

  const GRID_CELL = 96;
  const colCount  = Math.ceil(width  / GRID_CELL) + 1;
  const rowCount  = Math.ceil(height / GRID_CELL) + 1;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, overflow: "hidden" }}>
      {/* Izgara katmanı */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, opacity: 0.45 }}
      >
        {Array.from({ length: colCount }).map((_, i) => (
          <line
            key={`c${i}`}
            x1={i * GRID_CELL} y1={0}
            x2={i * GRID_CELL} y2={height}
            stroke={palette.grid}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: rowCount }).map((_, i) => (
          <line
            key={`r${i}`}
            x1={0}     y1={i * GRID_CELL}
            x2={width} y2={i * GRID_CELL}
            stroke={palette.grid}
            strokeWidth={1}
          />
        ))}
      </svg>

      {/* Scanline glow — accent rengi ile yavaş yatay tarama */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: scanlineY,
        height: 3,
        background: `linear-gradient(90deg, transparent 0%, ${palette.accent}40 30%, ${palette.accent}80 50%, ${palette.accent}40 70%, transparent 100%)`,
        filter: "blur(4px)",
        pointerEvents: "none",
      }} />

      {/* Yatay ışık dalgası — ekranın %40 yüksekliğinde */}
      <div style={{
        position: "absolute",
        left: 0, right: 0,
        top: "40%",
        height: 2,
        background: palette.grid.replace("0.07", "0.6"),
        opacity: pulseOpacity,
        filter: "blur(3px)",
      }} />

      {/* Kenar karartma (vignette) */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.80) 100%)",
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
};
