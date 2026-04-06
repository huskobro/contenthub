import { useState } from "react";
import { cn } from "../../lib/cn";
import type { TemplateStyleLinkResponse } from "../../api/templateStyleLinksApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDateShort } from "../../lib/formatDate";
import { TemplateStyleLinkReadinessSummary } from "./TemplateStyleLinkReadinessSummary";

interface TemplateStyleLinksTableProps {
  links: TemplateStyleLinkResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-success-light text-success-text",
  inactive: "bg-neutral-100 text-neutral-600",
  archived: "bg-neutral-100 text-neutral-500",
};

const COLUMNS = [
  { key: "template_id", label: "Template ID" },
  { key: "blueprint_id", label: "Blueprint ID" },
  { key: "role", label: "Role" },
  { key: "status", label: "Durum" },
  { key: "readiness", label: "Bağ Durumu" },
  { key: "date", label: "Tarih" },
];

export function TemplateStyleLinksTable({ links, selectedId, onSelect, onBulkDelete }: TemplateStyleLinksTableProps) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ status: null, link_role: null });
  const col = useColumnVisibility("template-style-links-table", COLUMNS.map((c) => c.key));

  const roles = Array.from(new Set(links.map((l) => l.link_role).filter(Boolean))) as string[];

  const filtered = links.filter((l) => {
    if (filters.status && l.status !== filters.status) return false;
    if (filters.link_role && l.link_role !== filters.link_role) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((l) => l.id));

  if (links.length === 0) {
    return <p className="text-neutral-500">Henüz template-style bağlantısı yok.</p>;
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
                { value: "active", label: "Aktif", count: links.filter((l) => l.status === "active").length },
                { value: "inactive", label: "Pasif", count: links.filter((l) => l.status === "inactive").length },
                { value: "archived", label: "Arşiv", count: links.filter((l) => l.status === "archived").length },
              ],
            },
            ...(roles.length > 0 ? [{
              key: "link_role",
              label: "Role",
              options: roles.map((r) => ({ value: r, label: r })),
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
              {col.isVisible("template_id") && <th className="px-3 py-2.5 border-b border-border-subtle">Template ID</th>}
              {col.isVisible("blueprint_id") && <th className="px-3 py-2.5 border-b border-border-subtle">Blueprint ID</th>}
              {col.isVisible("role") && <th className="px-3 py-2.5 border-b border-border-subtle">Role</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("readiness") && <th className="px-3 py-2.5 border-b border-border-subtle">Bağ Durumu</th>}
              {col.isVisible("date") && <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((link) => (
              <tr
                key={link.id}
                className={cn(
                  "cursor-pointer border-b border-neutral-100 transition-colors",
                  selectedId === link.id ? "bg-info-light" : "hover:bg-neutral-50",
                  sel.isSelected(link.id) && "bg-brand-500 bg-opacity-5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.isSelected(link.id)} onChange={() => sel.toggle(link.id)} className="cursor-pointer accent-brand-500" />
                </td>
                {col.isVisible("template_id") && (
                  <td className="px-3 py-2.5 font-mono text-sm text-neutral-600 cursor-pointer" onClick={() => onSelect(link.id)}>
                    {link.template_id.slice(0, 8)}…
                  </td>
                )}
                {col.isVisible("blueprint_id") && (
                  <td className="px-3 py-2.5 font-mono text-sm text-neutral-600 cursor-pointer" onClick={() => onSelect(link.id)}>
                    {link.style_blueprint_id.slice(0, 8)}…
                  </td>
                )}
                {col.isVisible("role") && (
                  <td className="px-3 py-2.5 text-neutral-600 cursor-pointer" onClick={() => onSelect(link.id)}>{link.link_role ?? "—"}</td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => onSelect(link.id)}>
                    <span className={cn("px-2 py-0.5 rounded-full text-sm font-medium", STATUS_CLASSES[link.status] ?? "bg-neutral-100 text-neutral-600")}>
                      {link.status ?? "—"}
                    </span>
                  </td>
                )}
                {col.isVisible("readiness") && (
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => onSelect(link.id)}>
                    <TemplateStyleLinkReadinessSummary
                      status={link.status}
                      linkRole={link.link_role}
                      templateId={link.template_id}
                      styleBlueprintId={link.style_blueprint_id}
                    />
                  </td>
                )}
                {col.isVisible("date") && (
                  <td className="px-3 py-2.5 text-neutral-500 text-sm cursor-pointer" onClick={() => onSelect(link.id)}>
                    {formatDateShort(link.created_at)}
                  </td>
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
