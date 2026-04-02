export type SourceConfigCoverageLevel =
  | "Feed tanımlı"
  | "Feed eksik"
  | "URL tanımlı"
  | "URL eksik"
  | "API tanımlı"
  | "API eksik"
  | "Tür belirsiz";

const styles: Record<SourceConfigCoverageLevel, { bg: string; color: string; border: string }> = {
  "Feed tanımlı": { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Feed eksik":   { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "URL tanımlı":  { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "URL eksik":    { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "API tanımlı":  { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "API eksik":    { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Tür belirsiz": { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
};

interface Props {
  level: SourceConfigCoverageLevel;
}

export function SourceConfigCoverageBadge({ level }: Props) {
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
