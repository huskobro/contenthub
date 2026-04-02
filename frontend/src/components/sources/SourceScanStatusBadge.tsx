interface Props {
  status?: string | null;
  scanCount?: number;
}

function statusStyle(status: string): React.CSSProperties {
  if (status === "completed") return { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  if (status === "failed") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (status === "running") return { background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" };
  return { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" };
}

export function SourceScanStatusBadge({ status, scanCount }: Props) {
  if (!status && (!scanCount || scanCount === 0)) {
    return (
      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Scan yok</span>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
      {status && (
        <span
          style={{
            display: "inline-block",
            padding: "0.1rem 0.35rem",
            fontSize: "0.7rem",
            borderRadius: "3px",
            whiteSpace: "nowrap",
            ...statusStyle(status),
          }}
        >
          {status}
        </span>
      )}
      {typeof scanCount === "number" && (
        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>({scanCount}x)</span>
      )}
    </div>
  );
}
