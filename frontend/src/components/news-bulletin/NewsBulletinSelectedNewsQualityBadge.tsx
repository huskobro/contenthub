import { colors, typography } from "../design-system/tokens";
export type QualityLevel = "İçerik yok" | "Zayıf set" | "Kısmi set" | "Güçlü set" | "Bilinmiyor";

const STYLES: Record<QualityLevel, { background: string; color: string }> = {
  "İçerik yok": { background: colors.neutral[100], color: colors.neutral[600] },
  "Zayıf set":  { background: colors.error.light, color: colors.error.text },
  "Kısmi set":  { background: colors.warning.light, color: colors.warning.text },
  "Güçlü set":  { background: colors.success.light, color: colors.success.text },
  "Bilinmiyor": { background: colors.neutral[100], color: colors.neutral[500] },
};

interface Props {
  level: QualityLevel;
  detail?: string;
}

export function NewsBulletinSelectedNewsQualityBadge({ level, detail }: Props) {
  const s = STYLES[level] ?? STYLES["Bilinmiyor"];
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.375rem",
        fontSize: typography.size.sm,
        fontWeight: 500,
        background: s.background,
        color: s.color,
        whiteSpace: "nowrap",
        gap: "1px",
      }}
    >
      <span>{level ?? "—"}</span>
      {detail && (
        <span style={{ fontSize: "0.65rem", fontWeight: 400, opacity: 0.8 }}>{detail}</span>
      )}
    </span>
  );
}
