export type NewsBulletinSourceCoverageLevel =
  | "Kaynak yok"
  | "Kaynak bilgisi eksik"
  | "Tek kaynak"
  | "Çoklu kaynak";

const styles: Record<NewsBulletinSourceCoverageLevel, { bg: string; color: string; border: string }> = {
  "Kaynak yok":           { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
  "Kaynak bilgisi eksik": { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Tek kaynak":           { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  "Çoklu kaynak":         { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
};

interface Props {
  level: NewsBulletinSourceCoverageLevel;
}

export function NewsBulletinSourceCoverageBadge({ level }: Props) {
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
