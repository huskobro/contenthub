export type TemplateStyleLinkReadinessLevel =
  | "Ana bağ"
  | "Yedek bağ"
  | "Deneysel"
  | "Aktif bağ"
  | "Pasif"
  | "Arşiv"
  | "Belirsiz";

const styles: Record<TemplateStyleLinkReadinessLevel, { bg: string; color: string; border: string }> = {
  "Ana bağ":   { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Yedek bağ": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Deneysel":  { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  "Aktif bağ": { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Pasif":     { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  "Arşiv":     { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
  "Belirsiz":  { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
};

interface Props {
  level: TemplateStyleLinkReadinessLevel;
}

export function TemplateStyleLinkReadinessBadge({ level }: Props) {
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
