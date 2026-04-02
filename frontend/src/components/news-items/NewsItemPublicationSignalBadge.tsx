export type NewsItemPublicationSignalLevel =
  | "Hariç"
  | "Kullanıldı"
  | "Yayına yakın"
  | "Aday"
  | "Zayıf";

const styles: Record<NewsItemPublicationSignalLevel, { bg: string; color: string; border: string }> = {
  "Hariç":       { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
  "Kullanıldı":  { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  "Yayına yakın":{ bg: "#dcfce7", color: "#166534", border: "#86efac" },
  "Aday":        { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  "Zayıf":       { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
};

interface Props {
  level: NewsItemPublicationSignalLevel;
}

export function NewsItemPublicationSignalBadge({ level }: Props) {
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
