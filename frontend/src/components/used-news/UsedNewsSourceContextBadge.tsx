import { colors, typography } from "../design-system/tokens";
type Level = "Scan kökenli" | "Kaynaklı" | "Kaynak yok" | "News item bulunamadı" | "Belirsiz";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Scan kökenli":         { background: colors.info.light, color: colors.brand[700] },
  "Kaynaklı":             { background: colors.success.light, color: colors.success.text },
  "Kaynak yok":           { background: colors.warning.light, color: colors.warning.text },
  "News item bulunamadı": { background: colors.error.light, color: colors.error.text },
  "Belirsiz":             { background: colors.neutral[100], color: colors.neutral[600] },
};

interface Props {
  level: Level;
}

export function UsedNewsSourceContextBadge({ level }: Props) {
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
