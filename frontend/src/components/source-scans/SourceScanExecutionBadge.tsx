export type SourceScanExecutionLevel =
  | "Bekliyor"
  | "Tamamlandı"
  | "Sonuç üretti"
  | "Hata aldı"
  | "Belirsiz";

const styles: Record<SourceScanExecutionLevel, { bg: string; color: string; border: string }> = {
  "Bekliyor":      { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Tamamlandı":    { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Sonuç üretti":  { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  "Hata aldı":     { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  "Belirsiz":      { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
};

interface Props {
  level: SourceScanExecutionLevel;
}

export function SourceScanExecutionBadge({ level }: Props) {
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
