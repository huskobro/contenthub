import { colors, typography } from "../design-system/tokens";
type Level = "Hedef bağlı" | "Hedef eksik" | "Hedef bulunamadı" | "Belirsiz";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Hedef bağlı":      { background: colors.success.light, color: colors.success.text },
  "Hedef eksik":      { background: colors.warning.light, color: colors.warning.text },
  "Hedef bulunamadı": { background: colors.error.light, color: colors.error.text },
  "Belirsiz":         { background: colors.neutral[100], color: colors.neutral[600] },
};

interface Props {
  level: Level;
}

export function UsedNewsTargetResolutionBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Belirsiz"];
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
