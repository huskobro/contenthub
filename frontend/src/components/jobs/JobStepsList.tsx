import type { JobStepResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { statusStyle } from "../design-system/tokens";
import { cn } from "../../lib/cn";

interface JobStepsListProps {
  steps: JobStepResponse[];
}

export function JobStepsList({ steps }: JobStepsListProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  if (safeSteps.length === 0) {
    return <p className="text-neutral-500 text-md">Henüz step yok.</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {safeSteps.map((s) => {
        const sStyle = statusStyle(s.status);
        return (
          <div
            key={s.id}
            className="py-3 px-4 border border-border-subtle rounded-md text-base bg-surface-card shadow-xs hover:shadow-sm transition-shadow duration-fast"
            style={{ borderLeft: `3px solid ${sStyle.color}` }}
          >
            <div className="flex justify-between items-center mb-1">
              <strong className="font-mono text-neutral-900 text-sm">{s.step_key}</strong>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-neutral-500">#{s.step_order}</span>
                <span
                  className="inline-block px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ background: sStyle.background, color: sStyle.color }}
                >
                  {s.status}
                </span>
              </div>
            </div>
            <div className="text-neutral-600 text-sm">
              elapsed: {formatDuration(s.elapsed_seconds)}
            </div>
            {s.last_error && (
              <div className="text-error mt-1 text-sm">{s.last_error}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
