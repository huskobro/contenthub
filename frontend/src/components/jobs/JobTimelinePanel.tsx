import type { JobStepResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";

interface JobTimelinePanelProps {
  steps: JobStepResponse[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#166534",
  running: "#1d4ed8",
  failed: "#dc2626",
  pending: "#64748b",
  cancelled: "#92400e",
};

export function JobTimelinePanel({ steps }: JobTimelinePanelProps) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        background: "#fafbfc",
        padding: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Timeline</h3>
      {steps.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>Henüz step yok.</p>
      ) : (
        <div>
          {steps.map((s, idx) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                gap: "1rem",
                paddingBottom: idx < steps.length - 1 ? "0.75rem" : 0,
                marginBottom: idx < steps.length - 1 ? "0.75rem" : 0,
                borderBottom: idx < steps.length - 1 ? "1px solid #f1f5f9" : "none",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#64748b",
                }}
              >
                {s.step_order}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.125rem" }}>
                  <strong style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{s.step_key}</strong>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: STATUS_COLORS[s.status] ?? "#64748b",
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  elapsed: {formatDuration(s.elapsed_seconds)}
                  {s.started_at && (
                    <span style={{ marginLeft: "0.75rem" }}>
                      başlangıç: {s.started_at.slice(0, 19).replace("T", " ")}
                    </span>
                  )}
                </div>
                {s.last_error && (
                  <div style={{ fontSize: "0.8125rem", color: "#dc2626", marginTop: "0.25rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    {s.last_error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
