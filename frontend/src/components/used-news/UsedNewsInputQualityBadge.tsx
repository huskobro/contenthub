type InputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

interface Props {
  level: InputQualityLevel;
}

const STYLES: Record<InputQualityLevel, { background: string; color: string }> = {
  "Zayıf giriş": { background: "#fee2e2", color: "#991b1b" },
  "Kısmi giriş": { background: "#fef9c3", color: "#854d0e" },
  "Güçlü giriş": { background: "#dcfce7", color: "#166534" },
};

export function UsedNewsInputQualityBadge({ level }: Props) {
  const style = STYLES[level] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: 500,
        background: style.background,
        color: style.color,
      }}
    >
      {level ?? "—"}
    </span>
  );
}
