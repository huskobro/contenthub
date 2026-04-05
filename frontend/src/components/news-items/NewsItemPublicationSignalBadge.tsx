import { colors, radius, typography } from "../design-system/tokens";
export type NewsItemPublicationSignalLevel =
  | "Hariç"
  | "Kullanıldı"
  | "Yayına yakın"
  | "Aday"
  | "Zayıf";

const styles: Record<NewsItemPublicationSignalLevel, { bg: string; color: string; border: string }> = {
  "Hariç":       { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
  "Kullanıldı":  { bg: colors.info.light, color: colors.brand[700], border: colors.info.light },
  "Yayına yakın":{ bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Aday":        { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Zayıf":       { bg: colors.error.light, color: colors.error.text, border: colors.error.light },
};

interface Props {
  level: NewsItemPublicationSignalLevel;
}

export function NewsItemPublicationSignalBadge({ level }: Props) {
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
