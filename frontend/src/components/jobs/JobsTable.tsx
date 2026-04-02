import type { JobResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { JobContextSummary } from "./JobContextSummary";

interface JobsTableProps {
  jobs: JobResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function JobsTable({ jobs, selectedId, onSelect }: JobsTableProps) {
  if (jobs.length === 0) {
    return <p style={{ color: "#64748b" }}>Henüz kayıtlı job yok.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
          <th style={{ padding: "0.5rem" }}>module_type</th>
          <th style={{ padding: "0.5rem" }}>Context</th>
          <th style={{ padding: "0.5rem" }}>status</th>
          <th style={{ padding: "0.5rem" }}>current_step_key</th>
          <th style={{ padding: "0.5rem" }}>retry_count</th>
          <th style={{ padding: "0.5rem" }}>elapsed</th>
          <th style={{ padding: "0.5rem" }}>created_at</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((j) => (
          <tr
            key={j.id}
            onClick={() => onSelect(j.id)}
            style={{
              borderBottom: "1px solid #f1f5f9",
              cursor: "pointer",
              background: selectedId === j.id ? "#eff6ff" : "transparent",
            }}
          >
            <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{j.module_type}</td>
            <td style={{ padding: "0.5rem" }}>
              <JobContextSummary moduleType={j.module_type} sourceContextJson={j.source_context_json} />
            </td>
            <td style={{ padding: "0.5rem" }}>{j.status}</td>
            <td style={{ padding: "0.5rem" }}>
              {j.current_step_key ?? <em style={{ color: "#94a3b8" }}>—</em>}
            </td>
            <td style={{ padding: "0.5rem" }}>{j.retry_count}</td>
            <td style={{ padding: "0.5rem", fontSize: "0.8125rem", color: "#64748b" }}>
              {formatDuration(j.elapsed_total_seconds)}
            </td>
            <td style={{ padding: "0.5rem", fontSize: "0.8125rem", color: "#64748b" }}>
              {j.created_at.slice(0, 19).replace("T", " ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
