type SpecificityLevel = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

interface Props {
  level: SpecificityLevel;
}

const STYLES: Record<SpecificityLevel, { background: string; color: string }> = {
  "Genel giriş":    { background: "#f1f5f9", color: "#64748b" },
  "Kısmi özgüllük": { background: "#fef9c3", color: "#854d0e" },
  "Belirgin giriş": { background: "#dcfce7", color: "#166534" },
};

export function JobInputSpecificityBadge({ level }: Props) {
  const style = STYLES[level] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: 500,
        background: style.background,
        color: style.color,
      }}
    >
      {level ?? "—"}
    </span>
  );
}
