import { useState } from "react";
import type { JobResponse } from "../../api/jobsApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

interface JobsTableProps {
  jobs: JobResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeIndex?: number;
  onBulkDelete?: (ids: string[]) => void;
  /** Called when user confirms archive for a terminal-state job. */
  onArchive?: (jobId: string) => void;
  /** Job ID currently in confirm state (first click done, awaiting second). */
  archiveConfirmId?: string | null;
  /** Called on first click to enter confirm state. */
  onArchiveConfirmStart?: (jobId: string) => void;
  /** True while archive mutation is in-flight. */
  archivePending?: boolean;
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

const JOB_COLUMNS = [
  { key: "module", label: "Modül" },
  { key: "status", label: "Durum" },
  { key: "step", label: "Adım" },
  { key: "retry", label: "Tekrar" },
  { key: "duration", label: "Süre" },
  { key: "date", label: "Tarih" },
];

export function JobsTable({ jobs, selectedId, onSelect, activeIndex, onBulkDelete, onArchive, archiveConfirmId, onArchiveConfirmStart, archivePending }: JobsTableProps) {
  const showArchiveCol = !!(onArchive && onArchiveConfirmStart);
  const [filters, setFilters] = useState<Record<string, string | null>>({ status: null, module_type: null });
  const col = useColumnVisibility("jobs-table", JOB_COLUMNS.map((c) => c.key));

  const filtered = jobs.filter((j) => {
    if (filters.status && j.status !== filters.status) return false;
    if (filters.module_type && j.module_type !== filters.module_type) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((j) => j.id));
  const modules = Array.from(new Set(jobs.map((j) => j.module_type)));

  if (jobs.length === 0) return <p className="text-neutral-600">Henüz kayıtlı job yok.</p>;

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <TableFilterBar
          groups={[
            {
              key: "status",
              label: "Durum",
              options: [
                { value: "completed", label: "Tamamlandı", count: jobs.filter((j) => j.status === "completed").length },
                { value: "failed", label: "Başarısız", count: jobs.filter((j) => j.status === "failed").length },
                { value: "queued", label: "Kuyrukta", count: jobs.filter((j) => j.status === "queued").length },
                { value: "retrying", label: "Yeniden", count: jobs.filter((j) => j.status === "retrying").length },
              ],
            },
            {
              key: "module_type",
              label: "Modül",
              options: modules.map((m) => ({ value: m, label: m })),
            },
          ]}
          active={filters}
          onChange={(key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); sel.clear(); }}
        />
        <ColumnSelector columns={JOB_COLUMNS} visible={col.visible} onToggle={col.toggle} />
      </div>

      <BulkActionBar
        selectedCount={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          ...(onBulkDelete ? [{ label: "Seçilenleri Sil", variant: "danger" as const, onClick: () => { onBulkDelete(sel.selectedIds); sel.clear(); } }] : []),
        ]}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-md">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="px-3 py-2.5 border-b border-border w-8">
                <input type="checkbox" checked={sel.isAllSelected} ref={(el) => { if (el) el.indeterminate = sel.isIndeterminate; }} onChange={sel.toggleAll} className="cursor-pointer accent-brand-500" />
              </th>
              {col.isVisible("module") && <th className="px-4 py-2.5 border-b border-border min-w-[120px]">Modül</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border">Durum</th>}
              {col.isVisible("step") && <th className="px-3 py-2.5 border-b border-border">Adım</th>}
              {col.isVisible("retry") && <th className="px-3 py-2.5 border-b border-border text-right">Tekrar</th>}
              {col.isVisible("duration") && <th className="px-3 py-2.5 border-b border-border">Süre</th>}
              {col.isVisible("date") && <th className="px-3 py-2.5 border-b border-border">Tarih</th>}
              {showArchiveCol && <th className="px-3 py-2.5 border-b border-border w-24"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((j, idx) => {
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
                    sel.isSelected(j.id) && "bg-brand-500 bg-opacity-5",
                  )}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={sel.isSelected(j.id)} onChange={() => sel.toggle(j.id)} className="cursor-pointer accent-brand-500" />
                  </td>
                  {col.isVisible("module") && <td className="px-4 py-2.5 font-mono text-sm">{j.module_type}</td>}
                  {col.isVisible("status") && (
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusBadge(j.status))}>{j.status}</span>
                    </td>
                  )}
                  {col.isVisible("step") && <td className="px-3 py-2.5 text-neutral-600">{j.current_step_key ?? <span className="text-neutral-400">—</span>}</td>}
                  {col.isVisible("retry") && <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">{j.retry_count > 0 ? j.retry_count : "—"}</td>}
                  {col.isVisible("duration") && <td className="px-3 py-2.5 text-neutral-600 tabular-nums">{formatDuration(j.elapsed_total_seconds)}</td>}
                  {col.isVisible("date") && <td className="px-3 py-2.5 text-neutral-500 text-sm">{formatDateShort(j.created_at)}</td>}
                  {showArchiveCol && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {TERMINAL_STATUSES.has(j.status) && (
                        archiveConfirmId === j.id ? (
                          <button
                            title="Bu job arşivlenir ve varsayılan listeden kaldırılır. Veriler silinmez."
                            onClick={() => onArchive!(j.id)}
                            disabled={archivePending}
                            className="text-xs px-2 py-0.5 rounded bg-error text-neutral-0 font-medium cursor-pointer border-0 disabled:opacity-50"
                          >
                            Onayla
                          </button>
                        ) : (
                          <button
                            onClick={() => onArchiveConfirmStart!(j.id)}
                            disabled={archivePending}
                            className="text-xs px-2 py-0.5 rounded text-neutral-500 hover:text-warning cursor-pointer border border-border-subtle bg-transparent disabled:opacity-50"
                          >
                            Arşivle
                          </button>
                        )
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={showArchiveCol ? 8 : 7} className="px-4 py-6 text-center text-neutral-500 text-sm">Filtre kriterlerine uygun kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
