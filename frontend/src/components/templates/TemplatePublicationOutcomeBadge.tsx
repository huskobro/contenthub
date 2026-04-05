import { colors, radius, typography } from "../design-system/tokens";
type Level = "Hazırlanıyor" | "Ham çıktı" | "Aday çıktı" | "Yayına yakın çıktı";

const STYLES: Record<Level, { bg: string; color: string }> = {
  "Hazırlanıyor":       { bg: colors.neutral[100], color: colors.neutral[600] },
  "Ham çıktı":          { bg: colors.warning.light, color: colors.warning.text },
  "Aday çıktı":         { bg: colors.info.light, color: colors.brand[700] },
  "Yayına yakın çıktı": { bg: colors.success.light, color: colors.success.text },
};

interface Props {
  level: Level;
}

export function TemplatePublicationOutcomeBadge({ level }: Props) {
  const s = STYLES[level] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: radius.full,
        fontSize: typography.size.sm,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level ?? "—"}
    </span>
  );
}
