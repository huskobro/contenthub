type Level = "Taslağa bağlı" | "Planlandı" | "Yayınlandı" | "Bağ eksik" | "Belirsiz";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Taslağa bağlı": { background: "#f0fdf4", color: "#166534" },
  "Planlandı":     { background: "#dbeafe", color: "#1e40af" },
  "Yayınlandı":    { background: "#dcfce7", color: "#14532d" },
  "Bağ eksik":     { background: "#fef9c3", color: "#854d0e" },
  "Belirsiz":      { background: "#f1f5f9", color: "#64748b" },
};

interface Props {
  level: Level;
}

export function UsedNewsPublicationLinkageBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Belirsiz"];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.375rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        background: s.background,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level}
    </span>
  );
}
