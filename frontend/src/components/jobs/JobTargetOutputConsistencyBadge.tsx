type ConsistencyLevel = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

interface Props {
  level: ConsistencyLevel;
}

const STYLES: Record<ConsistencyLevel, { background: string; color: string }> = {
  "Artifacts yok": { background: "#f1f5f9", color: "#64748b" },
  "Tek taraflı":   { background: "#fef9c3", color: "#854d0e" },
  "Tutarsız":      { background: "#fee2e2", color: "#991b1b" },
  "Dengeli":       { background: "#dcfce7", color: "#166534" },
};

export function JobTargetOutputConsistencyBadge({ level }: Props) {
  const style = STYLES[level] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: 500,
        background: style.background,
        color: style.color,
      }}
    >
      {level ?? "—"}
    </span>
  );
}
