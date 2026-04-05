import { colors, radius, typography } from "../design-system/tokens";
import type { SourceScanInputQualityLevel } from "./SourceScanInputQualitySummary";

const STYLES: Record<SourceScanInputQualityLevel, { bg: string; color: string }> = {
  "Zayıf giriş": { bg: colors.error.light, color: colors.error.text },
  "Kısmi giriş": { bg: colors.warning.light, color: colors.warning.text },
  "Güçlü giriş": { bg: colors.success.light, color: colors.success.text },
};

interface Props {
  level: SourceScanInputQualityLevel;
}

export function SourceScanInputQualityBadge({ level }: Props) {
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
