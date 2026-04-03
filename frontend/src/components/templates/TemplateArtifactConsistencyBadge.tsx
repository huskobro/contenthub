export type ArtifactConsistencyLevel = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

const STYLES: Record<ArtifactConsistencyLevel, { background: string; color: string }> = {
  "Artifacts yok": { background: "#f1f5f9", color: "#64748b" },
  "Tek taraflı":   { background: "#fef9c3", color: "#854d0e" },
  "Tutarsız":      { background: "#fee2e2", color: "#991b1b" },
  "Dengeli":       { background: "#dcfce7", color: "#166534" },
};

interface Props {
  level: ArtifactConsistencyLevel;
}

export function TemplateArtifactConsistencyBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Artifacts yok"];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.375rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        background: s.background,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level ?? "—"}
    </span>
  );
}
