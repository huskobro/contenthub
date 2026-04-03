type Level = "Zincir yok" | "İçerik zincirinde" | "Yayın zincirinde" | "Kısmi zincir" | "Belirsiz";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Zincir yok":        { background: "#f1f5f9", color: "#64748b" },
  "İçerik zincirinde": { background: "#dbeafe", color: "#1e40af" },
  "Yayın zincirinde":  { background: "#dcfce7", color: "#166534" },
  "Kısmi zincir":      { background: "#fef9c3", color: "#854d0e" },
  "Belirsiz":          { background: "#f1f5f9", color: "#94a3b8" },
};

interface Props {
  level: Level;
}

export function NewsItemPublicationLineageBadge({ level }: Props) {
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
      {level ?? "—"}
    </span>
  );
}
