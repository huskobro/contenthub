export type SourcePublicationSupplyLevel =
  | "İçerik yok"
  | "Ham içerik"
  | "Aday içerik var"
  | "Kullanılmış içerik var"
  | "Bilinmiyor";

const styles: Record<SourcePublicationSupplyLevel, { bg: string; color: string; border: string }> = {
  "İçerik yok":           { bg: "#f8fafc", color: "#94a3b8", border: "#cbd5e1" },
  "Ham içerik":           { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  "Aday içerik var":      { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Kullanılmış içerik var":{ bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  "Bilinmiyor":           { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
};

interface Props {
  level: SourcePublicationSupplyLevel;
}

export function SourcePublicationSupplyBadge({ level }: Props) {
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
