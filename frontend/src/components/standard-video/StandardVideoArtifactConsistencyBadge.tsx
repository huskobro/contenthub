import { colors, typography } from "../design-system/tokens";
export type ArtifactConsistencyLevel = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

const STYLES: Record<ArtifactConsistencyLevel, { background: string; color: string }> = {
  "Artifacts yok": { background: colors.neutral[100], color: colors.neutral[600] },
  "Tek taraflı":   { background: colors.warning.light, color: colors.warning.text },
  "Tutarsız":      { background: colors.error.light, color: colors.error.text },
  "Dengeli":       { background: colors.success.light, color: colors.success.text },
};

interface Props {
  level: ArtifactConsistencyLevel;
}

export function StandardVideoArtifactConsistencyBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Artifacts yok"];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.375rem",
        fontSize: typography.size.sm,
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
