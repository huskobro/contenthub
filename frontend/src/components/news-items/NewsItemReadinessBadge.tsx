import { colors, radius, typography } from "../design-system/tokens";
export type NewsItemReadinessLevel =
  | "Başlangıç"
  | "Ham kayıt"
  | "Gözden geçirildi"
  | "Kullanıldı"
  | "Hariç"
  | "Kısmen hazır";

const styles: Record<NewsItemReadinessLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":         { bg: colors.neutral[100], color: colors.neutral[600], border: colors.border.default },
  "Ham kayıt":         { bg: colors.info.light, color: colors.info.dark, border: colors.info.light },
  "Gözden geçirildi":  { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Kullanıldı":        { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Hariç":             { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.subtle },
  "Kısmen hazır":      { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
};

interface Props {
  level: NewsItemReadinessLevel;
}

export function NewsItemReadinessBadge({ level }: Props) {
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
