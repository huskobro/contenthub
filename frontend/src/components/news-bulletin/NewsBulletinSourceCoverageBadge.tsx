import { colors, radius, typography } from "../design-system/tokens";
export type NewsBulletinSourceCoverageLevel =
  | "Kaynak yok"
  | "Kaynak bilgisi eksik"
  | "Tek kaynak"
  | "Çoklu kaynak";

const styles: Record<NewsBulletinSourceCoverageLevel, { bg: string; color: string; border: string }> = {
  "Kaynak yok":           { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
  "Kaynak bilgisi eksik": { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Tek kaynak":           { bg: colors.info.light, color: colors.brand[700], border: colors.info.light },
  "Çoklu kaynak":         { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
};

interface Props {
  level: NewsBulletinSourceCoverageLevel;
}

export function NewsBulletinSourceCoverageBadge({ level }: Props) {
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
