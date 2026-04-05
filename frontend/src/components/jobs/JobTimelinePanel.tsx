import type { JobStepResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateISO } from "../../lib/formatDate";
import { colors, radius, typography } from "../design-system/tokens";

interface JobTimelinePanelProps {
  steps: JobStepResponse[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: colors.success.text,
  running: colors.info.dark,
  failed: colors.error.base,
  pending: colors.neutral[600],
  cancelled: colors.warning.text,
};

export function JobTimelinePanel({ steps }: JobTimelinePanelProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  return (
    <div
      style={{
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.md,
        background: colors.neutral[50],
        padding: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3 style={{ margin: "0 0 0.75rem", fontSize: typography.size.lg }}>Timeline</h3>
      {safeSteps.length === 0 ? (
        <p style={{ color: colors.neutral[500], fontSize: typography.size.md, margin: 0 }}>Henüz step yok.</p>
      ) : (
        <div>
          {safeSteps.map((s, idx) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                gap: "1rem",
                paddingBottom: idx < safeSteps.length - 1 ? "0.75rem" : 0,
                marginBottom: idx < safeSteps.length - 1 ? "0.75rem" : 0,
                borderBottom: idx < safeSteps.length - 1 ? `1px solid ${colors.neutral[100]}` : "none",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: colors.border.subtle,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: typography.size.sm,
                  fontWeight: 600,
                  color: colors.neutral[600],
                }}
              >
                {s.step_order}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.125rem" }}>
                  <strong style={{ fontFamily: "monospace", fontSize: typography.size.md }}>{s.step_key}</strong>
                  <span
                    style={{
                      fontSize: typography.size.sm,
                      fontWeight: 600,
                      color: STATUS_COLORS[s.status] ?? colors.neutral[600],
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                <div style={{ fontSize: typography.size.base, color: colors.neutral[600] }}>
                  elapsed: {formatDuration(s.elapsed_seconds)}
                  {s.started_at && (
                    <span style={{ marginLeft: "0.75rem" }}>
                      başlangıç: {formatDateISO(s.started_at)}
                    </span>
                  )}
                </div>
                {s.last_error && (
                  <div style={{ fontSize: typography.size.base, color: colors.error.base, marginTop: "0.25rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>
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
