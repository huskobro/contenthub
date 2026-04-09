import { useState } from "react";
import type { VisibilityRuleResponse } from "../../api/visibilityApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { cn } from "../../lib/cn";

const DASH = "—";

interface VisibilityRulesTableProps {
  rules: VisibilityRuleResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const COLUMNS = [
  { key: "rule_type", label: "Kural Tipi" },
  { key: "target_key", label: "Hedef Key" },
  { key: "module_scope", label: "Modül" },
  { key: "role_scope", label: "Rol" },
  { key: "status", label: "Durum" },
  { key: "priority", label: "Öncelik" },
];

export function VisibilityRulesTable({ rules, selectedId, onSelect, onBulkDelete }: VisibilityRulesTableProps) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ rule_type: null, status: null, module_scope: null });
  const col = useColumnVisibility("visibility-rules-table", COLUMNS.map((c) => c.key));

  const ruleTypes = Array.from(new Set(rules.map((r) => r.rule_type).filter(Boolean))) as string[];
  const modules = Array.from(new Set(rules.map((r) => r.module_scope).filter(Boolean))) as string[];

  const filtered = rules.filter((r) => {
    if (filters.rule_type && r.rule_type !== filters.rule_type) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.module_scope && r.module_scope !== filters.module_scope) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((r) => r.id));

  if (rules.length === 0) {
    return <p className="text-neutral-600">Henüz kayıtlı visibility rule yok.</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <TableFilterBar
          groups={[
            ...(ruleTypes.length > 0 ? [{
              key: "rule_type",
              label: "Kural Tipi",
              options: ruleTypes.map((t) => ({ value: t, label: t })),
            }] : []),
            {
              key: "status",
              label: "Durum",
              options: [
                { value: "active", label: "Aktif", count: rules.filter((r) => r.status === "active").length },
                { value: "inactive", label: "Pasif", count: rules.filter((r) => r.status === "inactive").length },
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
              {col.isVisible("rule_type") && <th className="px-3 py-2.5 border-b border-border-subtle">Kural Tipi</th>}
              {col.isVisible("target_key") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[180px]">Hedef Key</th>}
              {col.isVisible("module_scope") && <th className="px-3 py-2.5 border-b border-border-subtle">Modül</th>}
              {col.isVisible("role_scope") && <th className="px-3 py-2.5 border-b border-border-subtle">Rol</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("priority") && <th className="px-3 py-2.5 border-b border-border-subtle text-right">Öncelik</th>}
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
                {col.isVisible("rule_type") && (
                  <td className="px-3 py-2.5 cursor-pointer">
                    <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">{r.rule_type ?? DASH}</span>
                  </td>
                )}
                {col.isVisible("target_key") && (
                  <td className="px-4 py-2.5 font-mono text-sm break-all [overflow-wrap:anywhere] text-brand-600 cursor-pointer">{r.target_key ?? DASH}</td>
                )}
                {col.isVisible("module_scope") && (
                  <td className="px-3 py-2.5 text-neutral-600 cursor-pointer">{r.module_scope ?? <em className="text-neutral-500">—</em>}</td>
                )}
                {col.isVisible("role_scope") && (
                  <td className="px-3 py-2.5 text-neutral-600 cursor-pointer">{r.role_scope ?? <em className="text-neutral-500">—</em>}</td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5 cursor-pointer">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", r.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700")}>
                      {r.status ?? DASH}
                    </span>
                  </td>
                )}
                {col.isVisible("priority") && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-500 cursor-pointer">{r.priority ?? DASH}</td>
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
