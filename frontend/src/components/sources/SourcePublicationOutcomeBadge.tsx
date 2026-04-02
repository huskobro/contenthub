type Level = "Hazırlanıyor" | "Ham çıktı" | "Aday çıktı" | "Yayına yakın çıktı";

const STYLES: Record<Level, { bg: string; color: string }> = {
  "Hazırlanıyor":       { bg: "#f1f5f9", color: "#64748b" },
  "Ham çıktı":          { bg: "#fef9c3", color: "#854d0e" },
  "Aday çıktı":         { bg: "#dbeafe", color: "#1e40af" },
  "Yayına yakın çıktı": { bg: "#dcfce7", color: "#166534" },
};

interface Props {
  level: Level;
}

export function SourcePublicationOutcomeBadge({ level }: Props) {
  const s = STYLES[level];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level}
    </span>
  );
}
