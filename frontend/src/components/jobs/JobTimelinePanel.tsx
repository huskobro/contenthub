import type { JobStepResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateISO } from "../../lib/formatDate";
import { useElapsedTimer } from "../../hooks/useElapsedTimer";

interface JobTimelinePanelProps {
  steps: JobStepResponse[];
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-success",
  running: "bg-brand-500 ring-4 ring-brand-100 animate-pulse",
  failed: "bg-error",
  skipped: "bg-neutral-300",
  pending: "bg-neutral-200 border-2 border-neutral-300",
  cancelled: "bg-warning",
};

const STATUS_TEXT: Record<string, string> = {
  completed: "text-success-dark",
  running: "text-brand-700",
  failed: "text-error-dark",
  skipped: "text-neutral-400",
  pending: "text-neutral-500",
  cancelled: "text-warning-dark",
};

function StepRow({ step, isLast }: { step: JobStepResponse; isLast: boolean }) {
  const isRunning = step.status === "running";
  const serverElapsed = step.elapsed_seconds_live ?? step.elapsed_seconds;
  const liveElapsed = useElapsedTimer(serverElapsed, isRunning);

  return (
    <div className="flex gap-3 relative" data-testid={`timeline-step-${step.step_key}`}>
      {/* Vertical connector line */}
      <div className="flex flex-col items-center w-5 shrink-0">
        <div
          className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${STATUS_DOT[step.status] ?? "bg-neutral-200"}`}
        />
        {!isLast && (
          <div className="w-0.5 flex-1 bg-neutral-200 mt-1" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-4 ${isLast ? "" : ""}`}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-medium text-neutral-800">
            {step.step_key}
          </span>
          <span
            lang="en"
            className={`text-xs font-semibold uppercase tracking-wide ${STATUS_TEXT[step.status] ?? "text-neutral-500"}`}
          >
            {step.status}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
          {/* Elapsed */}
          <span data-testid={`timeline-elapsed-${step.step_key}`}>
            {formatDuration(liveElapsed ?? step.elapsed_seconds)}
          </span>

          {/* Step ETA */}
          {isRunning && step.eta_seconds != null && step.eta_seconds > 0 && (
            <span className="text-neutral-400" data-testid={`timeline-eta-${step.step_key}`}>
              ~{formatDuration(step.eta_seconds)} kaldi
            </span>
          )}

          {/* Start time */}
          {step.started_at && (
            <span className="text-neutral-400">
              {formatDateISO(step.started_at)}
            </span>
          )}
        </div>

        {step.last_error && (
          <div className="text-xs text-error-dark mt-1 break-words [overflow-wrap:anywhere] bg-error-light rounded px-2 py-1">
            {step.last_error}
          </div>
        )}
      </div>
    </div>
  );
}

export function JobTimelinePanel({ steps }: JobTimelinePanelProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  return (
    <div className="border border-border-subtle rounded-md bg-neutral-50 p-4 mb-6">
      <h3 className="m-0 mb-3 text-lg" data-testid="timeline-heading">Timeline</h3>
      {safeSteps.length === 0 ? (
        <p className="text-neutral-500 text-sm m-0">Henuz step yok.</p>
      ) : (
        <div>
          {safeSteps.map((s, idx) => (
            <StepRow
              key={s.id}
              step={s}
              isLast={idx === safeSteps.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
