import { colors, radius, typography } from "../design-system/tokens";
export type StandardVideoReadinessLevel =
  | "Başlangıç"
  | "Taslak"
  | "Script hazır"
  | "Kısmen hazır"
  | "Hazır";

const styles: Record<StandardVideoReadinessLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":    { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
  "Taslak":       { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Script hazır": { bg: colors.info.light, color: colors.info.dark, border: colors.info.light },
  "Kısmen hazır": { bg: colors.brand[50], color: colors.brand[700], border: colors.brand[200] },
  "Hazır":        { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
};

interface Props {
  level: StandardVideoReadinessLevel;
}

export function StandardVideoReadinessBadge({ level }: Props) {
  const s = styles[level] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        fontSize: typography.size.xs,
        borderRadius: radius.sm,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {level ?? "—"}
    </span>
  );
}
