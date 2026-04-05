import { colors, radius, typography } from "../design-system/tokens";
type InputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

interface Props {
  level: InputQualityLevel;
}

const STYLES: Record<InputQualityLevel, { background: string; color: string }> = {
  "Zayıf giriş": { background: colors.error.light, color: colors.error.text },
  "Kısmi giriş": { background: colors.warning.light, color: colors.warning.text },
  "Güçlü giriş": { background: colors.success.light, color: colors.success.text },
};

export function UsedNewsInputQualityBadge({ level }: Props) {
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
