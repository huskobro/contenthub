type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

const STYLES: Record<Level, { bg: string; color: string }> = {
  "Genel giriş":    { bg: "#f1f5f9", color: "#64748b" },
  "Kısmi özgüllük": { bg: "#fef9c3", color: "#854d0e" },
  "Belirgin giriş": { bg: "#dcfce7", color: "#166534" },
};

interface Props {
  level: Level;
}

export function SourceInputSpecificityBadge({ level }: Props) {
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
