import { colors, radius, typography } from "../design-system/tokens";
export type NewsItemCompletenessLevel =
  | "Eksik"
  | "Kısmi"
  | "Dolu";

const styles: Record<NewsItemCompletenessLevel, { bg: string; color: string; border: string }> = {
  "Eksik": { bg: colors.error.light, color: colors.error.text, border: colors.error.light },
  "Kısmi": { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Dolu":  { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
};

interface Props {
  level: NewsItemCompletenessLevel;
}

export function NewsItemContentCompletenessBadge({ level }: Props) {
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
