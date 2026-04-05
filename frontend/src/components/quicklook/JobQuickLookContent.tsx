/**
 * JobQuickLookContent — Wave 1
 *
 * QuickLook preview content for a job item.
 * Shows key metadata, status, steps summary, and quick actions.
 */

import React from "react";
import type { JobResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateISO } from "../../lib/formatDate";
import { colors, typography, spacing, radius } from "../design-system/tokens";
import { StatusBadge, Mono, DetailGrid } from "../design-system/primitives";

interface JobQuickLookContentProps {
  job: JobResponse;
  onNavigate?: () => void;
}

export function JobQuickLookContent({ job, onNavigate }: JobQuickLookContentProps) {
  const em = <span style={{ color: colors.neutral[400] }}>—</span>;

  return (
    <div data-testid="quicklook-job-content">
      {/* Status header */}
      <div style={{ display: "flex", alignItems: "center", gap: spacing[3], marginBottom: spacing[4] }}>
        <StatusBadge status={job.status} size="md" />
        <span style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>
          {job.module_type}
        </span>
      </div>

      {/* Key info */}
      <DetailGrid
        items={[
          { label: "Job ID", value: <Mono>{job.id.substring(0, 12)}...</Mono> },
          { label: "Durum", value: job.status },
          { label: "Modul", value: job.module_type },
          { label: "Adim", value: job.current_step_key || em },
          { label: "Tekrar", value: String(job.retry_count) },
          { label: "Sure", value: formatDuration(job.elapsed_total_seconds) || em },
          { label: "Olusturulma", value: formatDateISO(job.created_at) || em },
        ]}
        testId="quicklook-job-details"
      />

      {/* Steps summary */}
      {job.steps && job.steps.length > 0 && (
        <div style={{ marginTop: spacing[4] }}>
          <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[700], marginBottom: spacing[2] }}>
            Adimlar ({job.steps.length})
          </p>
          <div style={{ display: "flex", gap: spacing[1], flexWrap: "wrap" }}>
            {job.steps.map((step) => (
              <span
                key={step.id}
                style={{
                  padding: `${spacing[1]} ${spacing[2]}`,
                  fontSize: typography.size.xs,
                  borderRadius: radius.sm,
                  background: step.status === "completed" ? colors.success.light
                    : step.status === "running" ? colors.warning.light
                    : step.status === "failed" ? colors.error.light
                    : colors.neutral[100],
                  color: step.status === "completed" ? colors.success.text
                    : step.status === "running" ? colors.warning.text
                    : step.status === "failed" ? colors.error.text
                    : colors.neutral[700],
                }}
              >
                {step.step_key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error if any */}
      {job.last_error && (
        <div style={{
          marginTop: spacing[3],
          padding: spacing[3],
          background: colors.error.light,
          borderRadius: radius.md,
          fontSize: typography.size.sm,
          color: colors.error.text,
        }}>
          {job.last_error}
        </div>
      )}

      {/* Navigate action */}
      {onNavigate && (
        <div style={{ marginTop: spacing[4], paddingTop: spacing[3], borderTop: `1px solid ${colors.border.subtle}` }}>
          <button
            onClick={onNavigate}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              fontSize: typography.size.base,
              fontWeight: typography.weight.medium,
              color: colors.brand[600],
              background: colors.brand[50],
              border: `1px solid ${colors.brand[200]}`,
              borderRadius: radius.md,
              cursor: "pointer",
            }}
            data-testid="quicklook-job-navigate"
          >
            Detay Sayfasina Git →
          </button>
        </div>
      )}
    </div>
  );
}
