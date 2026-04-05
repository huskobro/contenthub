import { colors, radius, typography } from "../design-system/tokens";
interface Props {
  status?: string | null;
  scanCount?: number;
}

function statusStyle(status: string): React.CSSProperties {
  if (status === "completed") return { background: colors.success.light, color: colors.success.text, border: `1px solid ${colors.success.light}` };
  if (status === "failed") return { background: colors.error.light, color: colors.error.text, border: `1px solid ${colors.error.light}` };
  if (status === "running") return { background: colors.info.light, color: colors.info.dark, border: `1px solid ${colors.info.light}` };
  return { background: colors.neutral[100], color: colors.neutral[600], border: `1px solid ${colors.border.subtle}` };
}

export function SourceScanStatusBadge({ status, scanCount }: Props) {
  if (!status && (!scanCount || scanCount === 0)) {
    return (
      <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>Scan yok</span>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
      {status && (
        <span
          style={{
            display: "inline-block",
            padding: "0.1rem 0.35rem",
            fontSize: typography.size.xs,
            borderRadius: radius.sm,
            whiteSpace: "nowrap",
            ...statusStyle(status),
          }}
        >
          {status ?? "—"}
        </span>
      )}
      {typeof scanCount === "number" && (
        <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>({scanCount}x)</span>
      )}
    </div>
  );
}
