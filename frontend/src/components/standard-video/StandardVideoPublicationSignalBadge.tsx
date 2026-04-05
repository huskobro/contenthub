import { colors, radius, typography } from "../design-system/tokens";
export type StandardVideoPublicationSignalLevel =
  | "Başlangıç"
  | "Taslak"
  | "Taslak hazır"
  | "Yayına yakın";

const styles: Record<StandardVideoPublicationSignalLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç": { bg: colors.neutral[50], color: colors.neutral[500], border: colors.border.default },
  "Taslak":    { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Taslak hazır": { bg: colors.info.light, color: colors.info.dark, border: colors.info.light },
  "Yayına yakın": { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
};

interface Props {
  level: StandardVideoPublicationSignalLevel;
}

export function StandardVideoPublicationSignalBadge({ level }: Props) {
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
