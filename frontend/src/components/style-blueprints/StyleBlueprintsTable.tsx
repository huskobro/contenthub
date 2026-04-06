import { useState } from "react";
import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface StyleBlueprintsTableProps {
  blueprints: StyleBlueprintResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const COLUMNS = [
  { key: "name", label: "Ad" },
  { key: "module", label: "Modül" },
  { key: "status", label: "Durum" },
  { key: "version", label: "Versiyon" },
  { key: "date", label: "Tarih" },
];

export function StyleBlueprintsTable({ blueprints, selectedId, onSelect, onBulkDelete }: StyleBlueprintsTableProps) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ status: null, module_scope: null });
  const col = useColumnVisibility("style-blueprints-table", COLUMNS.map((c) => c.key));

  const modules = Array.from(new Set(blueprints.map((bp) => bp.module_scope).filter(Boolean))) as string[];

  const filtered = blueprints.filter((bp) => {
    if (filters.status && bp.status !== filters.status) return false;
    if (filters.module_scope && bp.module_scope !== filters.module_scope) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((bp) => bp.id));

  if (blueprints.length === 0) {
    return <p className="text-neutral-500">Henüz style blueprint yok.</p>;
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
                { value: "active", label: "Aktif", count: blueprints.filter((bp) => bp.status === "active").length },
                { value: "draft", label: "Taslak", count: blueprints.filter((bp) => bp.status === "draft").length },
                { value: "archived", label: "Arşiv", count: blueprints.filter((bp) => bp.status === "archived").length },
              ],
            },
            ...(modules.length > 0 ? [{
              key: "module_scope",
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
              {col.isVisible("name") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[180px]">Ad</th>}
              {col.isVisible("module") && <th className="px-3 py-2.5 border-b border-border-subtle">Modül</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("version") && <th className="px-3 py-2.5 border-b border-border-subtle text-right">v</th>}
              {col.isVisible("date") && <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((bp) => (
              <tr
                key={bp.id}
                className={cn(
                  "border-b border-neutral-100 transition-colors",
                  selectedId === bp.id ? "bg-info-light" : "hover:bg-neutral-50",
                  sel.isSelected(bp.id) && "bg-brand-500 bg-opacity-5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.isSelected(bp.id)} onChange={() => sel.toggle(bp.id)} className="cursor-pointer accent-brand-500" />
                </td>
                {col.isVisible("name") && (
                  <td className={cn("px-4 py-2.5 min-w-[180px] cursor-pointer", selectedId === bp.id ? "font-semibold text-brand-700" : "font-medium text-brand-600")} onClick={() => onSelect(bp.id)}>
                    <div className="truncate max-w-[250px]" title={bp.name ?? ""}>{bp.name ?? DASH}</div>
                  </td>
                )}
                {col.isVisible("module") && (
                  <td className="px-3 py-2.5 text-neutral-600 text-sm cursor-pointer" onClick={() => onSelect(bp.id)}>{bp.module_scope ?? "global"}</td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => onSelect(bp.id)}>
                    <span className={cn("inline-block py-0.5 px-2 rounded-full text-sm", bp.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700")}>
                      {bp.status ?? DASH}
                    </span>
                  </td>
                )}
                {col.isVisible("version") && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-500 cursor-pointer" onClick={() => onSelect(bp.id)}>{bp.version ?? 0}</td>
                )}
                {col.isVisible("date") && (
                  <td className="px-3 py-2.5 text-neutral-500 text-sm cursor-pointer" onClick={() => onSelect(bp.id)}>{formatDateShort(bp.created_at)}</td>
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
