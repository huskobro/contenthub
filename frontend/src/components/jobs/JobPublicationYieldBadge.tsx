type YieldLevel =
  | "Sorunlu"
  | "Hazırlanıyor"
  | "Ham çıktı"
  | "Aday çıktı"
  | "Yayına yakın çıktı"
  | "Belirsiz";

interface Props {
  level: YieldLevel;
}

const STYLES: Record<YieldLevel, { background: string; color: string }> = {
  "Sorunlu":             { background: "#fee2e2", color: "#991b1b" },
  "Hazırlanıyor":        { background: "#e0f2fe", color: "#0369a1" },
  "Ham çıktı":           { background: "#fef9c3", color: "#854d0e" },
  "Aday çıktı":          { background: "#fef3c7", color: "#92400e" },
  "Yayına yakın çıktı":  { background: "#dcfce7", color: "#166534" },
  "Belirsiz":            { background: "#f1f5f9", color: "#64748b" },
};

export function JobPublicationYieldBadge({ level }: Props) {
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
