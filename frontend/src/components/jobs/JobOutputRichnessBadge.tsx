import { colors, radius, typography } from "../design-system/tokens";
export type JobOutputRichnessLevel =
  | "Sorunlu"
  | "Zayıf bağlam"
  | "Kısmi bağlam"
  | "Zengin bağlam";

const styles: Record<JobOutputRichnessLevel, { bg: string; color: string; border: string }> = {
  "Sorunlu":     { bg: colors.error.light, color: colors.error.text, border: colors.error.light },
  "Zayıf bağlam":{ bg: colors.neutral[50], color: colors.neutral[500], border: colors.border.default },
  "Kısmi bağlam":{ bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Zengin bağlam":{ bg: colors.success.light, color: colors.success.text, border: colors.success.light },
};

interface Props {
  level: JobOutputRichnessLevel;
}

export function JobOutputRichnessBadge({ level }: Props) {
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
