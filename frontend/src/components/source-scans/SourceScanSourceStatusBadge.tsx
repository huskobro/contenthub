import { colors, radius, typography } from "../design-system/tokens";
export type SourceScanSourceStatus =
  | "Bağlı"
  | "Kaynak yok"
  | "Kaynak bulunamadı"
  | "Bilinmiyor";

const styles: Record<SourceScanSourceStatus, { bg: string; color: string; border: string }> = {
  "Bağlı":            { bg: colors.success.light, color: colors.success.text, border: colors.success.light },
  "Kaynak yok":       { bg: colors.neutral[100], color: colors.neutral[500], border: colors.border.default },
  "Kaynak bulunamadı":{ bg: colors.warning.light, color: colors.warning.text, border: colors.warning.light },
  "Bilinmiyor":       { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle },
};

interface Props {
  status: SourceScanSourceStatus;
}

export function SourceScanSourceStatusBadge({ status }: Props) {
  const s = styles[status] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
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
      {status ?? "—"}
    </span>
  );
}
