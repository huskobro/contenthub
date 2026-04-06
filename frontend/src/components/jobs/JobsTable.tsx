import type { JobResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateISO } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

interface JobsTableProps {
  jobs: JobResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeIndex?: number;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "bg-success-light text-success-text",
    failed: "bg-error-light text-error-text",
    retrying: "bg-warning-light text-warning-text",
    queued: "bg-neutral-100 text-neutral-600",
    waiting: "bg-neutral-100 text-neutral-500",
    cancelled: "bg-neutral-100 text-neutral-500",
  };
  return map[status] ?? "bg-neutral-100 text-neutral-600";
}

export function JobsTable({ jobs, selectedId, onSelect, activeIndex }: JobsTableProps) {
  if (jobs.length === 0) {
    return <p className="text-neutral-600">Henuz kayitli job yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border min-w-[120px]">Modul</th>
            <th className="px-3 py-2.5 border-b border-border">Durum</th>
            <th className="px-3 py-2.5 border-b border-border">Adim</th>
            <th className="px-3 py-2.5 border-b border-border text-right">Tekrar</th>
            <th className="px-3 py-2.5 border-b border-border">Sure</th>
            <th className="px-3 py-2.5 border-b border-border">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j, idx) => {
            const isActive = activeIndex === idx;
            const isSelected = selectedId === j.id;
            return (
              <tr
                key={j.id}
                onClick={() => onSelect(j.id)}
                tabIndex={isActive ? 0 : -1}
                data-keyboard-active={isActive || undefined}
                className={cn(
                  "border-b border-neutral-100 cursor-pointer transition-colors",
                  isSelected && "bg-info-light",
                  !isSelected && isActive && "bg-neutral-50",
                  isActive && "outline outline-2 -outline-offset-2 outline-brand-500/25",
                )}
              >
                <td className="px-4 py-2.5 font-mono text-sm">{j.module_type}</td>
                <td className="px-3 py-2.5">
                  <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusBadge(j.status))}>
                    {j.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-neutral-600">
                  {j.current_step_key ?? <span className="text-neutral-400">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                  {j.retry_count > 0 ? j.retry_count : "—"}
                </td>
                <td className="px-3 py-2.5 text-neutral-600 tabular-nums">
                  {formatDuration(j.elapsed_total_seconds)}
                </td>
                <td className="px-3 py-2.5 text-neutral-500 text-sm">
                  {formatDateISO(j.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
