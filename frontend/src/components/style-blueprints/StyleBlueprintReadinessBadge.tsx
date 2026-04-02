export type StyleBlueprintReadinessLevel =
  | "Başlangıç"
  | "Taslak"
  | "Kısmen hazır"
  | "Hazır";

const styles: Record<StyleBlueprintReadinessLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":  { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
  "Taslak":     { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Kısmen hazır": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Hazır":      { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
};

interface Props {
  level: StyleBlueprintReadinessLevel;
}

export function StyleBlueprintReadinessBadge({ level }: Props) {
  const s = styles[level];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        fontSize: "0.7rem",
        borderRadius: "3px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {level}
    </span>
  );
}
