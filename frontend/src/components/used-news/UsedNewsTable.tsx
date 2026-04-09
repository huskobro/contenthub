import { useState } from "react";
import type { UsedNewsResponse } from "../../api/usedNewsApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface Props {
  records: UsedNewsResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const COLUMNS = [
  { key: "news_id", label: "Haber ID" },
  { key: "usage_type", label: "Kullanım Tipi" },
  { key: "target_module", label: "Hedef Modül" },
  { key: "target_entity", label: "Hedef Varlık" },
  { key: "date", label: "Tarih" },
];

export function UsedNewsTable({ records, selectedId, onSelect, onBulkDelete }: Props) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ usage_type: null, target_module: null });
  const col = useColumnVisibility("used-news-table", COLUMNS.map((c) => c.key));

  const usageTypes = Array.from(new Set(records.map((r) => r.usage_type).filter(Boolean))) as string[];
  const modules = Array.from(new Set(records.map((r) => r.target_module).filter(Boolean))) as string[];

  const filtered = records.filter((r) => {
    if (filters.usage_type && r.usage_type !== filters.usage_type) return false;
    if (filters.target_module && r.target_module !== filters.target_module) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((r) => r.id));

  if (records.length === 0) {
    return <p className="text-neutral-500">Henüz kullanılmış haber kaydı yok.</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <TableFilterBar
          groups={[
            ...(usageTypes.length > 0 ? [{
              key: "usage_type",
              label: "Kullanım",
              options: usageTypes.map((u) => ({ value: u, label: u })),
            }] : []),
            ...(modules.length > 0 ? [{
              key: "target_module",
              label: "Modül",
              options: modules.map((m) => ({ value: m, label: m })),
            }] : []),
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
              {col.isVisible("news_id") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[120px]">Haber ID</th>}
              {col.isVisible("usage_type") && <th className="px-3 py-2.5 border-b border-border-subtle">Kullanım Tipi</th>}
              {col.isVisible("target_module") && <th className="px-3 py-2.5 border-b border-border-subtle">Hedef Modül</th>}
              {col.isVisible("target_entity") && <th className="px-3 py-2.5 border-b border-border-subtle">Hedef Varlık</th>}
              {col.isVisible("date") && <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(r.id); } }}
                className={cn(
                  "border-b border-neutral-100 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-[-2px]",
                  selectedId === r.id ? "bg-info-light" : "hover:bg-neutral-50",
                  sel.isSelected(r.id) && "bg-brand-500 bg-opacity-5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.isSelected(r.id)} onChange={() => sel.toggle(r.id)} className="cursor-pointer accent-brand-500" />
                </td>
                {col.isVisible("news_id") && (
                  <td className="px-4 py-2.5 font-mono text-sm text-brand-600">
                    {r.news_item_id?.slice(0, 8) ?? DASH}
                  </td>
                )}
                {col.isVisible("usage_type") && (
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">{r.usage_type ?? DASH}</span>
                  </td>
                )}
                {col.isVisible("target_module") && (
                  <td className="px-3 py-2.5 text-neutral-600">{r.target_module ?? DASH}</td>
                )}
                {col.isVisible("target_entity") && (
                  <td className="px-3 py-2.5 font-mono text-sm text-neutral-500">
                    {r.target_entity_id?.slice(0, 8) ?? DASH}
                  </td>
                )}
                {col.isVisible("date") && (
                  <td className="px-3 py-2.5 text-neutral-500 text-sm">
                    {formatDateShort(r.created_at)}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-500 text-sm">Filtre kriterlerine uygun kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
