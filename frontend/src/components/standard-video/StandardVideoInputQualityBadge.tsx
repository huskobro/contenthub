export type InputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

const STYLES: Record<InputQualityLevel, { background: string; color: string }> = {
  "Zayıf giriş": { background: "#fee2e2", color: "#991b1b" },
  "Kısmi giriş": { background: "#fef9c3", color: "#854d0e" },
  "Güçlü giriş": { background: "#dcfce7", color: "#166534" },
};

interface Props {
  level: InputQualityLevel;
}

export function StandardVideoInputQualityBadge({ level }: Props) {
  const s = STYLES[level];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.375rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        background: s.background,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level}
    </span>
  );
}
