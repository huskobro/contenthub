export type SourceScanResultRichnessLevel =
  | "Boş çıktı"
  | "Çıktı var"
  | "Zengin çıktı"
  | "Sorunlu"
  | "Belirsiz";

const styles: Record<SourceScanResultRichnessLevel, { bg: string; color: string; border: string }> = {
  "Boş çıktı":   { bg: "#f8fafc", color: "#94a3b8", border: "#cbd5e1" },
  "Çıktı var":   { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Zengin çıktı":{ bg: "#dcfce7", color: "#166534", border: "#86efac" },
  "Sorunlu":     { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  "Belirsiz":    { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
};

interface Props {
  level: SourceScanResultRichnessLevel;
}

export function SourceScanResultRichnessBadge({ level }: Props) {
  const s = styles[level] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
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
      {level ?? "—"}
    </span>
  );
}
