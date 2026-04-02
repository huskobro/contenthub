type Level = "Bağ yok" | "Bağlı" | "Yayın bağı var" | "Bilinmiyor";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Bağ yok":       { background: "#f1f5f9", color: "#64748b" },
  "Bağlı":         { background: "#dbeafe", color: "#1e40af" },
  "Yayın bağı var":{ background: "#dcfce7", color: "#166534" },
  "Bilinmiyor":    { background: "#f1f5f9", color: "#94a3b8" },
};

interface Props {
  level: Level;
}

export function NewsItemUsedNewsLinkageBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Bilinmiyor"];
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
