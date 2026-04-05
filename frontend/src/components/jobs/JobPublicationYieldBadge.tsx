import { colors, radius, typography } from "../design-system/tokens";
type YieldLevel =
  | "Sorunlu"
  | "Hazırlanıyor"
  | "Ham çıktı"
  | "Aday çıktı"
  | "Yayına yakın çıktı"
  | "Belirsiz";

interface Props {
  level: YieldLevel;
}

const STYLES: Record<YieldLevel, { background: string; color: string }> = {
  "Sorunlu":             { background: colors.error.light, color: colors.error.text },
  "Hazırlanıyor":        { background: colors.info.light, color: colors.info.dark },
  "Ham çıktı":           { background: colors.warning.light, color: colors.warning.text },
  "Aday çıktı":          { background: colors.warning.light, color: colors.warning.text },
  "Yayına yakın çıktı":  { background: colors.success.light, color: colors.success.text },
  "Belirsiz":            { background: colors.neutral[100], color: colors.neutral[600] },
};

export function JobPublicationYieldBadge({ level }: Props) {
  const style = STYLES[level] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: radius.sm,
        fontSize: typography.size.sm,
        fontWeight: 500,
        background: style.background,
        color: style.color,
      }}
    >
      {level ?? "—"}
    </span>
  );
}
