import { colors, typography } from "../design-system/tokens";
type Level = "İçerik yok" | "Ham çıktı" | "Aday çıktı" | "Kullanılmış çıktı" | "Bilinmiyor";

const STYLES: Record<Level, { background: string; color: string }> = {
  "İçerik yok":        { background: colors.neutral[100], color: colors.neutral[600] },
  "Ham çıktı":         { background: colors.warning.light, color: colors.warning.text },
  "Aday çıktı":        { background: colors.info.light, color: colors.brand[700] },
  "Kullanılmış çıktı": { background: colors.success.light, color: colors.success.text },
  "Bilinmiyor":        { background: colors.neutral[100], color: colors.neutral[500] },
};

interface Props {
  level: Level;
}

export function SourceScanPublicationYieldBadge({ level }: Props) {
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
