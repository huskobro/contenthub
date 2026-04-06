import type { JobStepResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateISO } from "../../lib/formatDate";

interface JobTimelinePanelProps {
  steps: JobStepResponse[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: "text-success-text",
  running: "text-info-dark",
  failed: "text-error",
  pending: "text-neutral-600",
  cancelled: "text-warning-text",
};

export function JobTimelinePanel({ steps }: JobTimelinePanelProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  return (
    <div className="border border-border-subtle rounded-md bg-neutral-50 p-4 mb-6">
      <h3 className="m-0 mb-3 text-lg">Timeline</h3>
      {safeSteps.length === 0 ? (
        <p className="text-neutral-500 text-md m-0">Henüz step yok.</p>
      ) : (
        <div>
          {safeSteps.map((s, idx) => (
            <div
              key={s.id}
              className={`flex gap-4 ${idx < safeSteps.length - 1 ? "pb-3 mb-3 border-b border-neutral-100" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-border-subtle shrink-0 flex items-center justify-center text-sm font-semibold text-neutral-600">
                {s.step_order}
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <strong className="font-mono text-md">{s.step_key}</strong>
                  <span className={`text-sm font-semibold ${STATUS_COLORS[s.status] ?? "text-neutral-600"}`}>
                    {s.status}
                  </span>
                </div>
                <div className="text-base text-neutral-600">
                  elapsed: {formatDuration(s.elapsed_seconds)}
                  {s.started_at && (
                    <span className="ml-3">
                      başlangıç: {formatDateISO(s.started_at)}
                    </span>
                  )}
                </div>
                {s.last_error && (
                  <div className="text-base text-error mt-1 break-words [overflow-wrap:anywhere]">
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
