import { colors, radius, typography } from "../design-system/tokens";
export type SourcePublicationSupplyLevel =
  | "İçerik yok"
  | "Ham içerik"
  | "Aday içerik var"
  | "Kullanılmış içerik var"
  | "Bilinmiyor";

const styles: Record<SourcePublicationSupplyLevel, { bg: string; color: string; border: string }> = {
  "İçerik yok":           { bg: colors.neutral[50], color: colors.neutral[500], border: colors.border.default },
  "Ham içerik":           { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Aday içerik var":      { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Kullanılmış içerik var":{ bg: colors.info.light, color: colors.brand[700], border: colors.info.light },
  "Bilinmiyor":           { bg: colors.neutral[100], color: colors.neutral[600], border: colors.border.subtle },
};

interface Props {
  level: SourcePublicationSupplyLevel;
}

export function SourcePublicationSupplyBadge({ level }: Props) {
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
