import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

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

interface Props {
  style?: BulletinStyle;
}

const PALETTES: Record<BulletinStyle, { bg: string; accent: string; grid: string }> = {
  breaking:      { bg: "#0A0A0A", accent: "#DC2626", grid: "rgba(220,38,38,0.06)" },
  tech:          { bg: "#0D1B2A", accent: "#00E5FF", grid: "rgba(0,229,255,0.06)" },
  corporate:     { bg: "#0A1628", accent: "#2563EB", grid: "rgba(37,99,235,0.06)" },
  sport:         { bg: "#051A10", accent: "#10B981", grid: "rgba(16,185,129,0.06)" },
  finance:       { bg: "#1A1405", accent: "#F59E0B", grid: "rgba(245,158,11,0.06)" },
  weather:       { bg: "#0C1F3D", accent: "#38BDF8", grid: "rgba(56,189,248,0.06)" },
  science:       { bg: "#0F0B1E", accent: "#8B5CF6", grid: "rgba(139,92,246,0.06)" },
  entertainment: { bg: "#1A0515", accent: "#EC4899", grid: "rgba(236,72,153,0.06)" },
  dark:          { bg: "#000000", accent: "#94A3B8", grid: "rgba(148,163,184,0.06)" },
};

export const StudioBackground: React.FC<Props> = ({ style = "breaking" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const palette = PALETTES[style] ?? PALETTES.breaking;

  const pulse = interpolate(
    Math.sin((frame / 180) * Math.PI * 2),
    [-1, 1],
    [0.3, 0.7]
  );

  const cell = 96;
  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, overflow: "hidden" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, opacity: 0.4 }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <line key={`v${i}`} x1={i * cell} y1={0} x2={i * cell} y2={height} stroke={palette.grid} strokeWidth={1} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * cell} x2={width} y2={i * cell} stroke={palette.grid} strokeWidth={1} />
        ))}
      </svg>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "38%",
          height: 2,
          background: `linear-gradient(to right, transparent 0%, ${palette.accent} 40%, ${palette.accent} 60%, transparent 100%)`,
          opacity: pulse,
          filter: `blur(2px) drop-shadow(0 0 12px ${palette.accent})`,
        }}
      />

      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.82) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
