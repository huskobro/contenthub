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
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
          {label}
        </div>
        <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>—</span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
        {label}
      </div>
      <pre
        style={{
          margin: 0,
          padding: "0.5rem",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          fontSize: "0.8rem",
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
