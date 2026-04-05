import { colors, radius, typography } from "../design-system/tokens";
export type SourceScanExecutionLevel =
  | "Bekliyor"
  | "Tamamlandı"
  | "Sonuç üretti"
  | "Hata aldı"
  | "Belirsiz";

const styles: Record<SourceScanExecutionLevel, { bg: string; color: string; border: string }> = {
  "Bekliyor":      { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Tamamlandı":    { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Sonuç üretti":  { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Hata aldı":     { bg: colors.error.light, color: colors.error.text, border: colors.error.light },
  "Belirsiz":      { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
};

interface Props {
  level: SourceScanExecutionLevel;
}

export function SourceScanExecutionBadge({ level }: Props) {
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
