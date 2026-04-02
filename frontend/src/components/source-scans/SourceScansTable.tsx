import type { SourceScanResponse } from "../../api/sourceScansApi";

interface SourceScansTableProps {
  scans: SourceScanResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  queued: { bg: "#fef9c3", color: "#854d0e" },
  completed: { bg: "#dcfce7", color: "#166534" },
  failed: { bg: "#fee2e2", color: "#991b1b" },
};

export function SourceScansTable({ scans, selectedId, onSelect }: SourceScansTableProps) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Source ID</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Scan Mode</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Status</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Results</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Created</th>
        </tr>
      </thead>
      <tbody>
        {scans.map((scan) => {
          const colors = statusColors[scan.status] ?? { bg: "#f1f5f9", color: "#475569" };
          return (
            <tr
              key={scan.id}
              onClick={() => onSelect(scan.id)}
              style={{
                cursor: "pointer",
                background: selectedId === scan.id ? "#eff6ff" : "transparent",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <td style={{ padding: "0.5rem 0.75rem", color: "#1e40af", fontWeight: selectedId === scan.id ? 600 : 400, fontFamily: "monospace", fontSize: "0.8rem" }}>
                {scan.source_id.slice(0, 12)}…
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{scan.scan_mode}</td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <span style={{
                  display: "inline-block",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  background: colors.bg,
                  color: colors.color,
                }}>
                  {scan.status}
                </span>
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>
                {scan.result_count !== null ? scan.result_count : "—"}
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontSize: "0.8rem" }}>
                {new Date(scan.created_at).toLocaleDateString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
