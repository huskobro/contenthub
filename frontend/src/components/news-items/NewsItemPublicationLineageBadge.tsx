import { colors, typography } from "../design-system/tokens";
type Level = "Zincir yok" | "İçerik zincirinde" | "Yayın zincirinde" | "Kısmi zincir" | "Belirsiz";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Zincir yok":        { background: colors.neutral[100], color: colors.neutral[600] },
  "İçerik zincirinde": { background: colors.info.light, color: colors.brand[700] },
  "Yayın zincirinde":  { background: colors.success.light, color: colors.success.text },
  "Kısmi zincir":      { background: colors.warning.light, color: colors.warning.text },
  "Belirsiz":          { background: colors.neutral[100], color: colors.neutral[500] },
};

interface Props {
  level: Level;
}

export function NewsItemPublicationLineageBadge({ level }: Props) {
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
