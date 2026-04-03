type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

const STYLES: Record<Level, { bg: string; color: string }> = {
  "Artifacts yok": { bg: "#f1f5f9", color: "#64748b" },
  "Tek taraflı":   { bg: "#fef9c3", color: "#854d0e" },
  "Tutarsız":      { bg: "#fee2e2", color: "#991b1b" },
  "Dengeli":       { bg: "#dcfce7", color: "#166534" },
};

interface Props {
  level: Level;
}

export function NewsBulletinTargetOutputConsistencyBadge({ level }: Props) {
  const s = STYLES[level] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level ?? "—"}
    </span>
  );
}
