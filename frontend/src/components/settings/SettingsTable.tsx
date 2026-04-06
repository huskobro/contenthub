import { useState } from "react";
import { cn } from "../../lib/cn";
import type { SettingResponse } from "../../api/settingsApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";

const DASH = "—";

interface SettingsTableProps {
  settings: SettingResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const COLUMNS = [
  { key: "key", label: "Key" },
  { key: "group", label: "Grup" },
  { key: "type", label: "Tip" },
  { key: "status", label: "Durum" },
  { key: "version", label: "Versiyon" },
];

export function SettingsTable({ settings, selectedId, onSelect, onBulkDelete }: SettingsTableProps) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ group_name: null, type: null, status: null });
  const col = useColumnVisibility("settings-table", COLUMNS.map((c) => c.key));

  const groups = Array.from(new Set(settings.map((s) => s.group_name).filter(Boolean))) as string[];
  const types = Array.from(new Set(settings.map((s) => s.type).filter(Boolean))) as string[];

  const filtered = settings.filter((s) => {
    if (filters.group_name && s.group_name !== filters.group_name) return false;
    if (filters.type && s.type !== filters.type) return false;
    if (filters.status && s.status !== filters.status) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((s) => s.id));

  if (settings.length === 0) {
    return <p className="text-neutral-600">Henüz kayıtlı ayar yok.</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <TableFilterBar
          groups={[
            ...(groups.length > 0 ? [{
              key: "group_name",
              label: "Grup",
              options: groups.map((g) => ({ value: g, label: g })),
            }] : []),
            ...(types.length > 0 ? [{
              key: "type",
              label: "Tip",
              options: types.map((t) => ({ value: t, label: t })),
            }] : []),
            {
              key: "status",
              label: "Durum",
              options: [
                { value: "active", label: "Aktif", count: settings.filter((s) => s.status === "active").length },
                { value: "draft", label: "Taslak", count: settings.filter((s) => s.status === "draft").length },
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
              {col.isVisible("key") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[200px]">Key</th>}
              {col.isVisible("group") && <th className="px-3 py-2.5 border-b border-border-subtle">Grup</th>}
              {col.isVisible("type") && <th className="px-3 py-2.5 border-b border-border-subtle">Tip</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("version") && <th className="px-3 py-2.5 border-b border-border-subtle text-right">v</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "border-b border-neutral-100 cursor-pointer transition-colors",
                  selectedId === s.id ? "bg-info-light" : "hover:bg-neutral-50",
                  sel.isSelected(s.id) && "bg-brand-500 bg-opacity-5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.isSelected(s.id)} onChange={() => sel.toggle(s.id)} className="cursor-pointer accent-brand-500" />
                </td>
                {col.isVisible("key") && (
                  <td className="px-4 py-2.5 font-mono text-sm break-all [overflow-wrap:anywhere] text-brand-600 cursor-pointer">{s.key ?? DASH}</td>
                )}
                {col.isVisible("group") && (
                  <td className="px-3 py-2.5 text-neutral-600 cursor-pointer">{s.group_name ?? DASH}</td>
                )}
                {col.isVisible("type") && (
                  <td className="px-3 py-2.5 cursor-pointer">
                    <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">{s.type ?? DASH}</span>
                  </td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5 cursor-pointer">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", s.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700")}>
                      {s.status ?? DASH}
                    </span>
                  </td>
                )}
                {col.isVisible("version") && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-500 cursor-pointer">{s.version ?? 0}</td>
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
