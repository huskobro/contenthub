import { colors, radius, typography } from "../design-system/tokens";
type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

const STYLES: Record<Level, { bg: string; color: string }> = {
  "Genel giriş":    { bg: colors.neutral[100], color: colors.neutral[600] },
  "Kısmi özgüllük": { bg: colors.warning.light, color: colors.warning.text },
  "Belirgin giriş": { bg: colors.success.light, color: colors.success.text },
};

interface Props {
  level: Level;
}

export function SourceInputSpecificityBadge({ level }: Props) {
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
