import { colors, radius, typography } from "../design-system/tokens";
export type JobActionabilityLevel =
  | "Dikkat gerekli"
  | "Bekliyor"
  | "Çalışıyor"
  | "Tamamlandı"
  | "Belirsiz";

const styles: Record<JobActionabilityLevel, { bg: string; color: string; border: string }> = {
  "Dikkat gerekli": { bg: colors.error.light, color: colors.error.text, border: colors.error.light },
  "Bekliyor":       { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Çalışıyor":      { bg: colors.info.light, color: colors.info.dark, border: colors.info.light },
  "Tamamlandı":     { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Belirsiz":       { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
};

interface Props {
  level: JobActionabilityLevel;
}

export function JobActionabilityBadge({ level }: Props) {
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
