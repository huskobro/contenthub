import { colors, radius, typography } from "../design-system/tokens";
import { safeJsonPretty } from "../../lib/safeJson";

interface JsonPreviewFieldProps {
  label: string;
  value: string | null | undefined;
}

/** Reusable JSON preview block with safe parse, overflow handling, and null fallback. */
export function JsonPreviewField({ label, value }: JsonPreviewFieldProps) {
  if (!value) {
    return (
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: typography.size.sm, fontWeight: 600, color: colors.neutral[600], marginBottom: "0.25rem" }}>
          {label}
        </div>
        <span style={{ color: colors.neutral[500], fontSize: typography.size.md }}>—</span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: typography.size.sm, fontWeight: 600, color: colors.neutral[600], marginBottom: "0.25rem" }}>
        {label}
      </div>
      <pre
        style={{
          margin: 0,
          padding: "0.5rem",
          background: colors.neutral[50],
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.sm,
          fontSize: typography.size.base,
          overflowX: "auto",
          maxHeight: "120px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          overflowWrap: "anywhere",
        }}
      >
        {safeJsonPretty(value)}
      </pre>
    </div>
  );
}
