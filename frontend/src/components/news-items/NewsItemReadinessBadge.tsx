export type NewsItemReadinessLevel =
  | "Başlangıç"
  | "Ham kayıt"
  | "Gözden geçirildi"
  | "Kullanıldı"
  | "Hariç"
  | "Kısmen hazır";

const styles: Record<NewsItemReadinessLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":         { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  "Ham kayıt":         { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Gözden geçirildi":  { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Kullanıldı":        { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Hariç":             { bg: "#f1f5f9", color: "#94a3b8", border: "#e2e8f0" },
  "Kısmen hazır":      { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
};

interface Props {
  level: NewsItemReadinessLevel;
}

export function NewsItemReadinessBadge({ level }: Props) {
  const s = styles[level];
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
      {level}
    </span>
  );
}
