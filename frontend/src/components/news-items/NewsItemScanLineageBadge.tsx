import { colors, radius, typography } from "../design-system/tokens";
export type NewsItemScanLineageLevel =
  | "Scan bağlı"
  | "Manuel"
  | "Scan referansı"
  | "Scan bulunamadı"
  | "Bilinmiyor";

const styles: Record<NewsItemScanLineageLevel, { bg: string; color: string; border: string }> = {
  "Scan bağlı":      { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Manuel":          { bg: colors.neutral[100], color: colors.neutral[700], border: colors.border.default },
  "Scan referansı":  { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Scan bulunamadı": { bg: colors.error.light, color: colors.error.text, border: colors.error.light },
  "Bilinmiyor":      { bg: colors.neutral[50], color: colors.neutral[500], border: colors.border.subtle },
};

interface Props {
  level: NewsItemScanLineageLevel;
}

export function NewsItemScanLineageBadge({ level }: Props) {
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
