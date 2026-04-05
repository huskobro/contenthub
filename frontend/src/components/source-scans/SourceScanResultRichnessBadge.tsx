import { colors, radius, typography } from "../design-system/tokens";
export type SourceScanResultRichnessLevel =
  | "Boş çıktı"
  | "Çıktı var"
  | "Zengin çıktı"
  | "Sorunlu"
  | "Belirsiz";

const styles: Record<SourceScanResultRichnessLevel, { bg: string; color: string; border: string }> = {
  "Boş çıktı":   { bg: colors.neutral[50], color: colors.neutral[500], border: colors.border.default },
  "Çıktı var":   { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Zengin çıktı":{ bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Sorunlu":     { bg: colors.error.light, color: colors.error.text, border: colors.error.light },
  "Belirsiz":    { bg: colors.neutral[100], color: colors.neutral[600], border: colors.border.subtle },
};

interface Props {
  level: SourceScanResultRichnessLevel;
}

export function SourceScanResultRichnessBadge({ level }: Props) {
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
