import { colors, radius } from "../design-system/tokens";
export type ArtifactStatus = "Var" | "Eksik" | "Bilinmiyor";

const styles: Record<ArtifactStatus, { bg: string; color: string; border: string }> = {
  "Var":        { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Eksik":      { bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Bilinmiyor": { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
};

interface Props {
  status: ArtifactStatus;
}

export function StandardVideoArtifactStatusBadge({ status }: Props) {
  const s = styles[status] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.35rem",
        fontSize: "0.65rem",
        borderRadius: radius.sm,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status ?? "—"}
    </span>
  );
}
