import { useMemo, useState } from "react";
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

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün Değerlendirme",
  educational_video: "Eğitim Videosu",
  howto_video: "Nasıl Yapılır",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Kuyrukta",
  running: "Çalışıyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal",
  retrying: "Yeniden",
  waiting: "Bekliyor",
};

function getModuleLabel(moduleType: string): string {
  return MODULE_LABELS[moduleType] ?? moduleType;
}

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
  /** Called when user clicks clone on a terminal-state job. */
  onClone?: (jobId: string) => void;
  /** True while clone mutation is in-flight. */
  clonePending?: boolean;
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

export function JobsTable({ jobs, selectedId, onSelect, activeIndex, onBulkDelete, onArchive, archiveConfirmId, onArchiveConfirmStart, archivePending, onClone, clonePending }: JobsTableProps) {
  const showActionsCol = !!(onArchive && onArchiveConfirmStart) || !!onClone;
  const [filters, setFilters] = useState<Record<string, string | null>>({ status: null, module_type: null });
  const col = useColumnVisibility("jobs-table", JOB_COLUMNS.map((c) => c.key));

  // Faz 4 perf: memoize filtered list, modules, and per-status counts so the
  // filter bar doesn't re-walk `jobs` four times on every render. With long
  // job histories (admin "all jobs") this used to be a 5x O(n) per re-render
  // including parent re-renders triggered by SSE.
  const filtered = useMemo(
    () =>
      jobs.filter((j) => {
        if (filters.status && j.status !== filters.status) return false;
        if (filters.module_type && j.module_type !== filters.module_type) return false;
        return true;
      }),
    [jobs, filters.status, filters.module_type],
  );

  const filteredIds = useMemo(() => filtered.map((j) => j.id), [filtered]);
  const sel = useTableSelection(filteredIds);
  const modules = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.module_type))),
    [jobs],
  );
  const statusCounts = useMemo(() => {
    const acc: Record<string, number> = {
      completed: 0,
      failed: 0,
      queued: 0,
      retrying: 0,
    };
    for (const j of jobs) {
      if (j.status in acc) acc[j.status]++;
    }
    return acc;
  }, [jobs]);

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
                { value: "completed", label: "Tamamlandı", count: statusCounts.completed },
                { value: "failed", label: "Başarısız", count: statusCounts.failed },
                { value: "queued", label: "Kuyrukta", count: statusCounts.queued },
                { value: "retrying", label: "Yeniden", count: statusCounts.retrying },
              ],
            },
            {
              key: "module_type",
              label: "Modül",
              options: modules.map((m) => ({ value: m, label: getModuleLabel(m) })),
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
              {showActionsCol && <th className="px-3 py-2.5 border-b border-border w-24"></th>}
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
                  {col.isVisible("module") && <td className="px-4 py-2.5 text-sm font-medium text-neutral-800">{getModuleLabel(j.module_type)}</td>}
                  {col.isVisible("status") && (
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusBadge(j.status))}>{STATUS_LABELS[j.status] ?? j.status}</span>
                    </td>
                  )}
                  {col.isVisible("step") && <td className="px-3 py-2.5 text-neutral-600">{j.current_step_key ?? <span className="text-neutral-400">—</span>}</td>}
                  {col.isVisible("retry") && <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">{j.retry_count > 0 ? j.retry_count : "—"}</td>}
                  {col.isVisible("duration") && <td className="px-3 py-2.5 text-neutral-600 tabular-nums">{formatDuration(j.elapsed_total_seconds)}</td>}
                  {col.isVisible("date") && <td className="px-3 py-2.5 text-neutral-500 text-sm">{formatDateShort(j.created_at)}</td>}
                  {showActionsCol && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {TERMINAL_STATUSES.has(j.status) && (
                        <div className="flex gap-1.5 items-center">
                          {onClone && (
                            <button
                              onClick={() => onClone(j.id)}
                              disabled={clonePending}
                              className="text-xs px-2 py-0.5 rounded text-brand-600 hover:text-brand-700 cursor-pointer border border-brand-200 bg-transparent disabled:opacity-50"
                            >
                              Klonla
                            </button>
                          )}
                          {onArchive && onArchiveConfirmStart && (
                            archiveConfirmId === j.id ? (
                              <button
                                title="Bu job arşivlenir ve varsayılan listeden kaldırılır. Veriler silinmez."
                                onClick={() => onArchive(j.id)}
                                disabled={archivePending}
                                className="text-xs px-2 py-0.5 rounded bg-error text-neutral-0 font-medium cursor-pointer border-0 disabled:opacity-50"
                              >
                                Onayla
                              </button>
                            ) : (
                              <button
                                onClick={() => onArchiveConfirmStart(j.id)}
                                disabled={archivePending}
                                className="text-xs px-2 py-0.5 rounded text-neutral-500 hover:text-warning cursor-pointer border border-border-subtle bg-transparent disabled:opacity-50"
                              >
                                Arşivle
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={showActionsCol ? 8 : 7} className="px-4 py-6 text-center text-neutral-500 text-sm">Filtre kriterlerine uygun kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
