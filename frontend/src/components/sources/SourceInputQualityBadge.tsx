import type { SourceInputQualityLevel } from "./SourceInputQualitySummary";

const STYLES: Record<SourceInputQualityLevel, { bg: string; color: string }> = {
  "Zayıf giriş": { bg: "#fee2e2", color: "#991b1b" },
  "Kısmi giriş": { bg: "#fef9c3", color: "#854d0e" },
  "Güçlü giriş": { bg: "#dcfce7", color: "#166534" },
};

interface Props {
  level: SourceInputQualityLevel;
}

export function SourceInputQualityBadge({ level }: Props) {
  const s = STYLES[level] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level ?? "—"}
    </span>
  );
}
