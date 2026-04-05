import { colors, typography } from "../design-system/tokens";
type Level = "Bağ yok" | "Bağlı" | "Yayın bağı var" | "Bilinmiyor";

const STYLES: Record<Level, { background: string; color: string }> = {
  "Bağ yok":       { background: colors.neutral[100], color: colors.neutral[600] },
  "Bağlı":         { background: colors.info.light, color: colors.brand[700] },
  "Yayın bağı var":{ background: colors.success.light, color: colors.success.text },
  "Bilinmiyor":    { background: colors.neutral[100], color: colors.neutral[500] },
};

interface Props {
  level: Level;
}

export function NewsItemUsedNewsLinkageBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Bilinmiyor"];
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
