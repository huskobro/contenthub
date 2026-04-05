import type { JobStepResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { colors, radius, typography } from "../design-system/tokens";

interface JobStepsListProps {
  steps: JobStepResponse[];
}

export function JobStepsList({ steps }: JobStepsListProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  if (safeSteps.length === 0) {
    return <p style={{ color: colors.neutral[500], fontSize: typography.size.md }}>Henüz step yok.</p>;
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {safeSteps.map((s) => (
        <div
          key={s.id}
          style={{
            padding: "0.5rem 0.75rem",
            marginBottom: "0.375rem",
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: radius.sm,
            fontSize: typography.size.base,
            background: colors.neutral[50],
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.125rem" }}>
            <strong style={{ fontFamily: "monospace" }}>{s.step_key}</strong>
            <span style={{ color: colors.neutral[600] }}>#{s.step_order} — {s.status}</span>
          </div>
          <div style={{ color: colors.neutral[600] }}>
            elapsed: {formatDuration(s.elapsed_seconds)}
          </div>
          {s.last_error && (
            <div style={{ color: colors.error.base, marginTop: "0.125rem" }}>{s.last_error}</div>
          )}
        </div>
      ))}
    </div>
  );
}
