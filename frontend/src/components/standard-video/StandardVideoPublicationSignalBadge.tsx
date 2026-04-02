export type StandardVideoPublicationSignalLevel =
  | "Başlangıç"
  | "Taslak"
  | "Taslak hazır"
  | "Yayına yakın";

const styles: Record<StandardVideoPublicationSignalLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç": { bg: "#f8fafc", color: "#94a3b8", border: "#cbd5e1" },
  "Taslak":    { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  "Taslak hazır": { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" },
  "Yayına yakın": { bg: "#dcfce7", color: "#166534", border: "#86efac" },
};

interface Props {
  level: StandardVideoPublicationSignalLevel;
}

export function StandardVideoPublicationSignalBadge({ level }: Props) {
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
