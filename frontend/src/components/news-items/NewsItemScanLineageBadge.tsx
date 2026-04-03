export type NewsItemScanLineageLevel =
  | "Scan bağlı"
  | "Manuel"
  | "Scan referansı"
  | "Scan bulunamadı"
  | "Bilinmiyor";

const styles: Record<NewsItemScanLineageLevel, { bg: string; color: string; border: string }> = {
  "Scan bağlı":      { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Manuel":          { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  "Scan referansı":  { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Scan bulunamadı": { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
  "Bilinmiyor":      { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" },
};

interface Props {
  level: NewsItemScanLineageLevel;
}

export function NewsItemScanLineageBadge({ level }: Props) {
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
