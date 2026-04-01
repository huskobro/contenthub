import type { JobStepResponse } from "../../api/jobsApi";

interface JobStepsListProps {
  steps: JobStepResponse[];
}

export function JobStepsList({ steps }: JobStepsListProps) {
  if (steps.length === 0) {
    return <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Henüz step yok.</p>;
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {steps.map((s) => (
        <div
          key={s.id}
          style={{
            padding: "0.5rem 0.75rem",
            marginBottom: "0.375rem",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "0.8125rem",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.125rem" }}>
            <strong style={{ fontFamily: "monospace" }}>{s.step_key}</strong>
            <span style={{ color: "#64748b" }}>#{s.step_order} — {s.status}</span>
          </div>
          {s.elapsed_seconds != null && (
            <div style={{ color: "#64748b" }}>elapsed: {s.elapsed_seconds}s</div>
          )}
          {s.last_error && (
            <div style={{ color: "#dc2626", marginTop: "0.125rem" }}>{s.last_error}</div>
          )}
        </div>
      ))}
    </div>
  );
}
