/**
 * StudioBackground — ContentHub haber bülteni arka planı.
 *
 * bulletinStyle prop'una göre kategori rengini seçer.
 * Animated grid + merkezi ışık dalgası + vignette.
 *
 * Animasyon kararları:
 *   - Grid: yarı saydam, her 96px'de bir ızgara çizgisi
 *   - Pulse: sin dalgası, 180 frame döngü (~3s at 60fps)
 *   - Vignette: radyal gradient, köşeleri karartan
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

// ── Palette (tek kaynak: shared/palette.ts'ten değil, burada tanımlı) ─────────
// StudioBackground palette'i bg+grid içeriyor; accent-only değerler shared/palette.ts'te.

interface StylePalette { bg: string; grid: string; }

const PALETTES: Record<BulletinStyle, StylePalette> = {
  breaking:      { bg: "#0A0A0A", grid: "rgba(220,38,38,0.07)"   },
  tech:          { bg: "#0D1B2A", grid: "rgba(0,229,255,0.07)"   },
  corporate:     { bg: "#0A1628", grid: "rgba(37,99,235,0.07)"   },
  sport:         { bg: "#051A10", grid: "rgba(16,185,129,0.07)"  },
  finance:       { bg: "#1A1405", grid: "rgba(245,158,11,0.07)"  },
  weather:       { bg: "#0C1F3D", grid: "rgba(56,189,248,0.07)"  },
  science:       { bg: "#0F0B1E", grid: "rgba(139,92,246,0.07)"  },
  entertainment: { bg: "#1A0515", grid: "rgba(236,72,153,0.07)"  },
  dark:          { bg: "#000000", grid: "rgba(148,163,184,0.07)" },
};

// ── Bileşen ────────────────────────────────────────────────────────────────────

interface Props {
  style?: BulletinStyle;
}

export const StudioBackground: React.FC<Props> = ({ style = "breaking" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const palette = PALETTES[style] ?? PALETTES.breaking;

  // Merkezi ışık dalgası: 3 saniyelik sin döngüsü (180 frame @ 60fps)
  const pulseOpacity = interpolate(
    Math.sin((frame / 180) * Math.PI * 2),
    [-1, 1],
    [0.25, 0.65]
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
