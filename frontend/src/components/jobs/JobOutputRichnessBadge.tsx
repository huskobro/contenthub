export type JobOutputRichnessLevel =
  | "Sorunlu"
  | "Zayıf bağlam"
  | "Kısmi bağlam"
  | "Zengin bağlam";

const styles: Record<JobOutputRichnessLevel, { bg: string; color: string; border: string }> = {
  "Sorunlu":     { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  "Zayıf bağlam":{ bg: "#f8fafc", color: "#94a3b8", border: "#cbd5e1" },
  "Kısmi bağlam":{ bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  "Zengin bağlam":{ bg: "#dcfce7", color: "#166534", border: "#86efac" },
};

interface Props {
  level: JobOutputRichnessLevel;
}

export function JobOutputRichnessBadge({ level }: Props) {
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
