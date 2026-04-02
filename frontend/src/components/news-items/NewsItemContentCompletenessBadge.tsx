export type NewsItemCompletenessLevel =
  | "Eksik"
  | "Kısmi"
  | "Dolu";

const styles: Record<NewsItemCompletenessLevel, { bg: string; color: string; border: string }> = {
  "Eksik": { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
  "Kısmi": { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Dolu":  { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
};

interface Props {
  level: NewsItemCompletenessLevel;
}

export function NewsItemContentCompletenessBadge({ level }: Props) {
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
