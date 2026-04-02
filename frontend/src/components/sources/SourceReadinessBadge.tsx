export type SourceReadinessLevel =
  | "Başlangıç"
  | "Yapılandı"
  | "Kısmen hazır"
  | "Dikkat gerekli"
  | "Hazır";

const styles: Record<SourceReadinessLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":      { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  "Yapılandı":      { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Kısmen hazır":   { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  "Dikkat gerekli": { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  "Hazır":          { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
};

interface Props {
  level: SourceReadinessLevel;
}

export function SourceReadinessBadge({ level }: Props) {
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
