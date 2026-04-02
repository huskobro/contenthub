export type NewsItemSourceStatus = "Bağlı" | "Kaynak yok" | "Bulunamadı" | "Bilinmiyor";

const styles: Record<NewsItemSourceStatus, { bg: string; color: string; border: string }> = {
  "Bağlı":       { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Kaynak yok":  { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
  "Bulunamadı":  { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Bilinmiyor":  { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

interface Props {
  status: NewsItemSourceStatus;
}

export function NewsItemSourceStatusBadge({ status }: Props) {
  const s = styles[status];
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
      {status}
    </span>
  );
}
