import { colors, radius, typography } from "../design-system/tokens";
type SpecificityLevel = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

interface Props {
  level: SpecificityLevel;
}

const STYLES: Record<SpecificityLevel, { background: string; color: string }> = {
  "Genel giriş":    { background: colors.neutral[100], color: colors.neutral[600] },
  "Kısmi özgüllük": { background: colors.warning.light, color: colors.warning.text },
  "Belirgin giriş": { background: colors.success.light, color: colors.success.text },
};

export function JobInputSpecificityBadge({ level }: Props) {
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
