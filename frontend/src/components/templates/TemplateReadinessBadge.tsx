export type TemplateReadinessLevel =
  | "Başlangıç"
  | "Taslak"
  | "Bağlandı"
  | "Kısmen hazır"
  | "Hazır";

const styles: Record<TemplateReadinessLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":    { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  "Taslak":       { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Bağlandı":     { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Kısmen hazır": { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  "Hazır":        { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
};

interface Props {
  level: TemplateReadinessLevel;
}

export function TemplateReadinessBadge({ level }: Props) {
  const s = styles[level] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
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
      {level ?? "—"}
    </span>
  );
}
