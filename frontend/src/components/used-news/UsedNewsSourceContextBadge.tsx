type Level = "Scan kökenli" | "Kaynaklı" | "Kaynak yok" | "News item bulunamadı" | "Belirsiz";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Scan kökenli":         { background: "#dbeafe", color: "#1e40af" },
  "Kaynaklı":             { background: "#dcfce7", color: "#166534" },
  "Kaynak yok":           { background: "#fef9c3", color: "#854d0e" },
  "News item bulunamadı": { background: "#fee2e2", color: "#991b1b" },
  "Belirsiz":             { background: "#f1f5f9", color: "#64748b" },
};

interface Props {
  level: Level;
}

export function UsedNewsSourceContextBadge({ level }: Props) {
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
