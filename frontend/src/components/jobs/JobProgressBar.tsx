import type { JobResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { useElapsedTimer } from "../../hooks/useElapsedTimer";

interface JobProgressBarProps {
  job: JobResponse;
}

export function JobProgressBar({ job }: JobProgressBarProps) {
  const steps = job.steps;
  const total = steps.length;
  const completed = steps.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;
  const fraction = total > 0 ? completed / total : 0;
  const percent = Math.round(fraction * 100);

  const isActive = ["running", "waiting", "retrying"].includes(job.status);

  // Use computed elapsed_seconds (live from backend) with client-side tick
  const serverElapsed = job.elapsed_seconds ?? job.elapsed_total_seconds;
  const liveElapsed = useElapsedTimer(serverElapsed, isActive);

  // ETA — prefer historical (eta_seconds) over linear (estimated_remaining_seconds)
  const eta = job.eta_seconds ?? job.estimated_remaining_seconds;

  const barColor = job.status === "failed"
    ? "bg-error"
    : job.status === "completed"
      ? "bg-success"
      : "bg-brand-500";

  return (
    <div data-testid="job-progress-bar" className="mb-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-800">
            {completed}/{total} adim
          </span>
          <span className="text-xs text-neutral-500">{percent}%</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          {liveElapsed !== null && (
            <span data-testid="job-progress-elapsed">
              {formatDuration(liveElapsed)}
            </span>
          )}
          {isActive && eta !== null && eta > 0 && (
            <span data-testid="job-progress-eta" className="text-neutral-400">
              ~{formatDuration(eta)} kaldi
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${Math.max(percent, isActive ? 2 : 0)}%` }}
          data-testid="job-progress-fill"
        />
      </div>

      {/* Step dots */}
      <div className="flex gap-1 mt-1.5 justify-center">
        {steps.map((step) => (
          <div
            key={step.id}
            title={`${step.step_key}: ${step.status}`}
            className={`w-2 h-2 rounded-full ${stepDotColor(step.status)}`}
          />
        ))}
      </div>
    </div>
  );
}

function stepDotColor(status: string): string {
  switch (status) {
    case "completed": return "bg-success";
    case "running": return "bg-brand-500 animate-pulse";
    case "failed": return "bg-error";
    case "skipped": return "bg-neutral-300";
    default: return "bg-neutral-200";
  }
}
