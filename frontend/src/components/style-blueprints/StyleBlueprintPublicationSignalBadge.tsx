import { colors, radius, typography } from "../design-system/tokens";
export type StyleBlueprintPublicationSignalLevel =
  | "Başlangıç"
  | "Taslak"
  | "Kısmen hazır"
  | "Yayına yakın";

const styles: Record<StyleBlueprintPublicationSignalLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç": { bg: colors.neutral[50], color: colors.neutral[500], border: colors.border.default },
  "Taslak":    { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Kısmen hazır": { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Yayına yakın": { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
};

interface Props {
  level: StyleBlueprintPublicationSignalLevel;
}

export function StyleBlueprintPublicationSignalBadge({ level }: Props) {
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
