export type JobActionabilityLevel =
  | "Dikkat gerekli"
  | "Bekliyor"
  | "Çalışıyor"
  | "Tamamlandı"
  | "Belirsiz";

const styles: Record<JobActionabilityLevel, { bg: string; color: string; border: string }> = {
  "Dikkat gerekli": { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  "Bekliyor":       { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Çalışıyor":      { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Tamamlandı":     { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Belirsiz":       { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
};

interface Props {
  level: JobActionabilityLevel;
}

export function JobActionabilityBadge({ level }: Props) {
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
