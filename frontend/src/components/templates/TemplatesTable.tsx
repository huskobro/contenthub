import { useState } from "react";
import type { TemplateResponse } from "../../api/templatesApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { cn } from "../../lib/cn";

const DASH = "—";

interface TemplatesTableProps {
  templates: TemplateResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const COLUMNS = [
  { key: "name", label: "Ad" },
  { key: "type", label: "Tür" },
  { key: "owner", label: "Sahip" },
  { key: "module", label: "Modül" },
  { key: "status", label: "Durum" },
  { key: "version", label: "Versiyon" },
];

export function TemplatesTable({ templates, selectedId, onSelect, onBulkDelete }: TemplatesTableProps) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ status: null, template_type: null, module_scope: null });
  const col = useColumnVisibility("templates-table", COLUMNS.map((c) => c.key));

  const types = Array.from(new Set(templates.map((t) => t.template_type).filter(Boolean))) as string[];
  const modules = Array.from(new Set(templates.map((t) => t.module_scope).filter(Boolean))) as string[];

  const filtered = templates.filter((t) => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.template_type && t.template_type !== filters.template_type) return false;
    if (filters.module_scope && t.module_scope !== filters.module_scope) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((t) => t.id));

  if (templates.length === 0) {
    return <p className="text-neutral-500">Henüz template yok.</p>;
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
                { value: "active", label: "Aktif", count: templates.filter((t) => t.status === "active").length },
                { value: "draft", label: "Taslak", count: templates.filter((t) => t.status === "draft").length },
                { value: "archived", label: "Arşiv", count: templates.filter((t) => t.status === "archived").length },
              ],
            },
            ...(types.length > 0 ? [{
              key: "template_type",
              label: "Tür",
              options: types.map((t) => ({ value: t, label: t })),
            }] : []),
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
              {col.isVisible("type") && <th className="px-3 py-2.5 border-b border-border-subtle">Tür</th>}
              {col.isVisible("owner") && <th className="px-3 py-2.5 border-b border-border-subtle">Sahip</th>}
              {col.isVisible("module") && <th className="px-3 py-2.5 border-b border-border-subtle">Modül</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("version") && <th className="px-3 py-2.5 border-b border-border-subtle text-right">v</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                className={cn(
                  "border-b border-neutral-100 transition-colors",
                  selectedId === t.id ? "bg-info-light" : "hover:bg-neutral-50",
                  sel.isSelected(t.id) && "bg-brand-500 bg-opacity-5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.isSelected(t.id)} onChange={() => sel.toggle(t.id)} className="cursor-pointer accent-brand-500" />
                </td>
                {col.isVisible("name") && (
                  <td className={cn("px-4 py-2.5 min-w-[180px] cursor-pointer", selectedId === t.id ? "font-semibold text-brand-700" : "font-medium text-brand-600")} onClick={() => onSelect(t.id)}>
                    <div className="truncate max-w-[250px]" title={t.name ?? ""}>{t.name ?? DASH}</div>
                  </td>
                )}
                {col.isVisible("type") && (
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => onSelect(t.id)}>
                    <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">{t.template_type ?? DASH}</span>
                  </td>
                )}
                {col.isVisible("owner") && (
                  <td className="px-3 py-2.5 text-neutral-600 cursor-pointer" onClick={() => onSelect(t.id)}>{t.owner_scope ?? DASH}</td>
                )}
                {col.isVisible("module") && (
                  <td className="px-3 py-2.5 text-neutral-600 text-sm cursor-pointer" onClick={() => onSelect(t.id)}>{t.module_scope ?? "global"}</td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => onSelect(t.id)}>
                    <span className={cn("inline-block py-0.5 px-2 rounded-full text-sm", t.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700")}>
                      {t.status ?? DASH}
                    </span>
                  </td>
                )}
                {col.isVisible("version") && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-500 cursor-pointer" onClick={() => onSelect(t.id)}>{t.version ?? 0}</td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-neutral-500 text-sm">Filtre kriterlerine uygun kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
