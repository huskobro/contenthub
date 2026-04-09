import { useState } from "react";
import { cn } from "../../lib/cn";
import type { SourceScanResponse } from "../../api/sourceScansApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDateShort } from "../../lib/formatDate";

const DASH = "—";

interface SourceScansTableProps {
  scans: SourceScanResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const statusClasses: Record<string, string> = {
  queued: "bg-warning-light text-warning-text",
  completed: "bg-success-light text-success-text",
  failed: "bg-error-light text-error-text",
};

const COLUMNS = [
  { key: "source", label: "Kaynak" },
  { key: "mode", label: "Mod" },
  { key: "status", label: "Durum" },
  { key: "result", label: "Sonuç" },
  { key: "date", label: "Tarih" },
];

export function SourceScansTable({ scans, selectedId, onSelect, onBulkDelete }: SourceScansTableProps) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ status: null, scan_mode: null });
  const col = useColumnVisibility("source-scans-table", COLUMNS.map((c) => c.key));

  const filtered = scans.filter((s) => {
    if (filters.status && s.status !== filters.status) return false;
    if (filters.scan_mode && s.scan_mode !== filters.scan_mode) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((s) => s.id));

  if (scans.length === 0) {
    return <p className="text-neutral-500">Henüz tarama kaydı yok.</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <TableFilterBar
          groups={[
            {
              key: "status",
              label: "Durum",
              options: [
                { value: "completed", label: "Tamamlandı", count: scans.filter((s) => s.status === "completed").length },
                { value: "queued", label: "Kuyrukta", count: scans.filter((s) => s.status === "queued").length },
                { value: "failed", label: "Başarısız", count: scans.filter((s) => s.status === "failed").length },
              ],
            },
            {
              key: "scan_mode",
              label: "Mod",
              options: [
                { value: "manual", label: "Manuel" },
                { value: "auto", label: "Otomatik" },
                { value: "curated", label: "Seçkili" },
              ],
            },
          ]}
          active={filters}
          onChange={(key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); sel.clear(); }}
        />
        <ColumnSelector columns={COLUMNS} visible={col.visible} onToggle={col.toggle} />
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
              <th className="px-3 py-2.5 border-b border-border-subtle w-8">
                <input type="checkbox" checked={sel.isAllSelected} ref={(el) => { if (el) el.indeterminate = sel.isIndeterminate; }} onChange={sel.toggleAll} className="cursor-pointer accent-brand-500" />
              </th>
              {col.isVisible("source") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[160px]">Kaynak</th>}
              {col.isVisible("mode") && <th className="px-3 py-2.5 border-b border-border-subtle">Mod</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("result") && <th className="px-3 py-2.5 border-b border-border-subtle text-right">Sonuç</th>}
              {col.isVisible("date") && <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const statusCls = statusClasses[s.status] ?? "bg-neutral-100 text-neutral-600";
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(s.id); } }}
                  className={cn(
                    "border-b border-neutral-100 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-[-2px]",
                    selectedId === s.id ? "bg-info-light" : "hover:bg-neutral-50",
                    sel.isSelected(s.id) && "bg-brand-500 bg-opacity-5",
                  )}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={sel.isSelected(s.id)} onChange={() => sel.toggle(s.id)} className="cursor-pointer accent-brand-500" />
                  </td>
                  {col.isVisible("source") && (
                    <td className="px-4 py-2.5 font-medium text-brand-600 min-w-[160px]">
                      <div className="truncate max-w-[200px]" title={s.source_name ?? s.source_id}>
                        {s.source_name ?? s.source_id?.slice(0, 8) ?? DASH}
                      </div>
                    </td>
                  )}
                  {col.isVisible("mode") && (
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">
                        {s.scan_mode ?? DASH}
                      </span>
                    </td>
                  )}
                  {col.isVisible("status") && (
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusCls)}>{s.status}</span>
                    </td>
                  )}
                  {col.isVisible("result") && (
                    <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                      {s.result_count ?? DASH}
                    </td>
                  )}
                  {col.isVisible("date") && (
                    <td className="px-3 py-2.5 text-neutral-500 text-sm">
                      {formatDateShort(s.created_at)}
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-500 text-sm">Filtre kriterlerine uygun kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
