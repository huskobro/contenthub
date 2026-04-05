import { colors, typography } from "../design-system/tokens";
type Level = "Sorunlu" | "Hazırlanıyor" | "Taslak çıktı" | "Yayına yakın çıktı" | "Belirsiz";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Sorunlu":           { background: colors.error.light, color: colors.error.text },
  "Hazırlanıyor":      { background: colors.warning.light, color: colors.warning.text },
  "Taslak çıktı":      { background: colors.info.light, color: colors.brand[700] },
  "Yayına yakın çıktı":{ background: colors.success.light, color: colors.success.text },
  "Belirsiz":          { background: colors.neutral[100], color: colors.neutral[600] },
};

interface Props {
  level: Level;
}

export function JobPublicationOutcomeBadge({ level }: Props) {
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
