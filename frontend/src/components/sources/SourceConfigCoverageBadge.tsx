import { colors, radius, typography } from "../design-system/tokens";
export type SourceConfigCoverageLevel =
  | "Feed tanımlı"
  | "Feed eksik"
  | "URL tanımlı"
  | "URL eksik"
  | "API tanımlı"
  | "API eksik"
  | "Tür belirsiz";

const styles: Record<SourceConfigCoverageLevel, { bg: string; color: string; border: string }> = {
  "Feed tanımlı": { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Feed eksik":   { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "URL tanımlı":  { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "URL eksik":    { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "API tanımlı":  { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "API eksik":    { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Tür belirsiz": { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
};

interface Props {
  level: SourceConfigCoverageLevel;
}

export function SourceConfigCoverageBadge({ level }: Props) {
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
