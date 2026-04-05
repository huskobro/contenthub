import { colors, radius, typography } from "../design-system/tokens";
type ConsistencyLevel = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

interface Props {
  level: ConsistencyLevel;
}

const STYLES: Record<ConsistencyLevel, { background: string; color: string }> = {
  "Artifacts yok": { background: colors.neutral[100], color: colors.neutral[600] },
  "Tek taraflı":   { background: colors.warning.light, color: colors.warning.text },
  "Tutarsız":      { background: colors.error.light, color: colors.error.text },
  "Dengeli":       { background: colors.success.light, color: colors.success.text },
};

export function JobTargetOutputConsistencyBadge({ level }: Props) {
  const style = STYLES[level] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: radius.sm,
        fontSize: typography.size.sm,
        fontWeight: 500,
        background: style.background,
        color: style.color,
      }}
    >
      {level ?? "—"}
    </span>
  );
}
