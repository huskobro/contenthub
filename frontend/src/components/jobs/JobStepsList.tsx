import type { JobStepResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { colors, radius, typography, spacing, shadow, transition } from "../design-system/tokens";
import { statusStyle } from "../design-system/tokens";

interface JobStepsListProps {
  steps: JobStepResponse[];
}

export function JobStepsList({ steps }: JobStepsListProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  if (safeSteps.length === 0) {
    return <p style={{ color: colors.neutral[500], fontSize: typography.size.md }}>Henüz step yok.</p>;
  }

  return (
    <div style={{ marginTop: spacing[2], display: "flex", flexDirection: "column", gap: spacing[2] }}>
      {safeSteps.map((s) => {
        const sStyle = statusStyle(s.status);
        return (
          <div
            key={s.id}
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radius.md,
              fontSize: typography.size.base,
              background: colors.surface.card,
              boxShadow: shadow.xs,
              borderLeft: `3px solid ${sStyle.color}`,
              transition: `box-shadow ${transition.fast}`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = shadow.sm; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = shadow.xs; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing[1] }}>
              <strong style={{ fontFamily: typography.monoFamily, color: colors.neutral[900], fontSize: typography.size.sm }}>{s.step_key}</strong>
              <div style={{ display: "flex", gap: spacing[2], alignItems: "center" }}>
                <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>#{s.step_order}</span>
                <span style={{
                  display: "inline-block",
                  padding: `${spacing[1]} ${spacing[2]}`,
                  borderRadius: radius.full,
                  fontSize: typography.size.xs,
                  fontWeight: typography.weight.semibold,
                  background: sStyle.background,
                  color: sStyle.color,
                }}>
                  {s.status}
                </span>
              </div>
            </div>
            <div style={{ color: colors.neutral[600], fontSize: typography.size.sm }}>
              elapsed: {formatDuration(s.elapsed_seconds)}
            </div>
            {s.last_error && (
              <div style={{ color: colors.error.base, marginTop: spacing[1], fontSize: typography.size.sm }}>{s.last_error}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
