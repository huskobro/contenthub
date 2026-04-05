import { colors, typography } from "../design-system/tokens";
export type InputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

const STYLES: Record<InputQualityLevel, { background: string; color: string }> = {
  "Zayıf giriş": { background: colors.error.light, color: colors.error.text },
  "Kısmi giriş": { background: colors.warning.light, color: colors.warning.text },
  "Güçlü giriş": { background: colors.success.light, color: colors.success.text },
};

interface Props {
  level: InputQualityLevel;
}

export function StandardVideoInputQualityBadge({ level }: Props) {
  const s = STYLES[level] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.375rem",
        fontSize: typography.size.sm,
        fontWeight: 500,
        background: s.background,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level ?? "—"}
    </span>
  );
}
