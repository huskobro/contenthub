export type ReadinessLevel = "Başlangıç" | "İçerik seçildi" | "Script hazır" | "Kısmen hazır" | "Hazır";

const styles: Record<ReadinessLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":       { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  "İçerik seçildi":  { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Script hazır":    { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Kısmen hazır":    { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  "Hazır":           { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
};

interface Props {
  level: ReadinessLevel;
}

export function NewsBulletinReadinessBadge({ level }: Props) {
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
