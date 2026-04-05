import { colors, radius, typography } from "../design-system/tokens";
export type TemplateStyleLinkReadinessLevel =
  | "Ana bağ"
  | "Yedek bağ"
  | "Deneysel"
  | "Aktif bağ"
  | "Pasif"
  | "Arşiv"
  | "Belirsiz";

const styles: Record<TemplateStyleLinkReadinessLevel, { bg: string; color: string; border: string }> = {
  "Ana bağ":   { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Yedek bağ": { bg: colors.info.light, color: colors.info.dark, border: colors.info.light },
  "Deneysel":  { bg: colors.brand[50], color: colors.brand[700], border: colors.brand[200] },
  "Aktif bağ": { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Pasif":     { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle },
  "Arşiv":     { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
  "Belirsiz":  { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
};

interface Props {
  level: TemplateStyleLinkReadinessLevel;
}

export function TemplateStyleLinkReadinessBadge({ level }: Props) {
  const s = styles[level] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        fontSize: typography.size.xs,
        borderRadius: radius.sm,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {level ?? "—"}
    </span>
  );
}
