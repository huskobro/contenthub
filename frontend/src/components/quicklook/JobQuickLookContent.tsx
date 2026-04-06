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
import { cn } from "../../lib/cn";
import { StatusBadge, Mono, DetailGrid } from "../design-system/primitives";

interface JobQuickLookContentProps {
  job: JobResponse;
  onNavigate?: () => void;
}

export function JobQuickLookContent({ job, onNavigate }: JobQuickLookContentProps) {
  const em = <span className="text-neutral-400">&mdash;</span>;

  return (
    <div data-testid="quicklook-job-content">
      {/* Status header */}
      <div className="flex items-center gap-3 mb-4">
        <StatusBadge status={job.status} size="md" />
        <span className="text-sm text-neutral-600">
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
        <div className="mt-4">
          <p className="text-sm font-semibold text-neutral-700 mb-2">
            Adimlar ({job.steps.length})
          </p>
          <div className="flex gap-1 flex-wrap">
            {job.steps.map((step) => (
              <span
                key={step.id}
                className={cn(
                  "py-1 px-2 text-xs rounded-sm",
                  step.status === "completed" && "bg-success-light text-success-text",
                  step.status === "running" && "bg-warning-light text-warning-text",
                  step.status === "failed" && "bg-error-light text-error-text",
                  step.status !== "completed" && step.status !== "running" && step.status !== "failed" && "bg-neutral-100 text-neutral-700",
                )}
              >
                {step.step_key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error if any */}
      {job.last_error && (
        <div className="mt-3 p-3 bg-error-light rounded-md text-sm text-error-text">
          {job.last_error}
        </div>
      )}

      {/* Navigate action */}
      {onNavigate && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <button
            onClick={onNavigate}
            className="py-2 px-4 text-base font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-md cursor-pointer hover:bg-brand-100"
            data-testid="quicklook-job-navigate"
          >
            Detay Sayfasina Git &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
