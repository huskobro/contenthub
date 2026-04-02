import type { StyleBlueprintInputQualityLevel } from "./StyleBlueprintInputQualitySummary";

const STYLES: Record<StyleBlueprintInputQualityLevel, { bg: string; color: string }> = {
  "Zayıf giriş": { bg: "#fee2e2", color: "#991b1b" },
  "Kısmi giriş": { bg: "#fef9c3", color: "#854d0e" },
  "Güçlü giriş": { bg: "#dcfce7", color: "#166534" },
};

interface Props {
  level: StyleBlueprintInputQualityLevel;
}

export function StyleBlueprintInputQualityBadge({ level }: Props) {
  const s = STYLES[level];
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
      {level}
    </span>
  );
}
