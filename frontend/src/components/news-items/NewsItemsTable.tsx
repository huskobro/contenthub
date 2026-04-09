import { useState } from "react";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface Props {
  items: NewsItemResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const statusColorMap: Record<string, string> = {
  new: "bg-info-light text-brand-700",
  pending: "bg-warning-light text-warning-text",
  used: "bg-success-light text-success-text",
  rejected: "bg-error-light text-error-text",
  ignored: "bg-neutral-100 text-neutral-500",
};

const COLUMNS = [
  { key: "title", label: "Başlık" },
  { key: "status", label: "Durum" },
  { key: "source", label: "Kaynak" },
  { key: "category", label: "Kategori" },
  { key: "language", label: "Dil" },
  { key: "date", label: "Tarih" },
];

export function NewsItemsTable({ items, selectedId, onSelect, onBulkDelete }: Props) {
  const [filters, setFilters] = useState<Record<string, string | null>>({
    status: null,
    language: null,
    source_id: null,
    category: null,
  });
  const col = useColumnVisibility("news-items-table", COLUMNS.map((c) => c.key));

  const filtered = items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.language && item.language !== filters.language) return false;
    if (filters.source_id && item.source_id !== filters.source_id) return false;
    if (filters.category && item.category !== filters.category) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((i) => i.id));

  function handleFilterChange(key: string, value: string | null) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    sel.clear();
  }

  const languages = Array.from(new Set(items.map((i) => i.language).filter(Boolean))) as string[];
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  // source options: unique source_id → source_name mapping
  const sourceMap = new Map<string, string>();
  items.forEach((i) => { if (i.source_id) sourceMap.set(i.source_id, i.source_name ?? i.source_id.slice(0, 8)); });

  if (items.length === 0) {
    return <p className="text-neutral-500">Henüz haber kaydı yok.</p>;
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
                { value: "new", label: "Yeni", count: items.filter((i) => i.status === "new").length },
                { value: "used", label: "Kullanıldı", count: items.filter((i) => i.status === "used").length },
                { value: "reviewed", label: "İncelendi", count: items.filter((i) => i.status === "reviewed").length },
                { value: "ignored", label: "Yoksayıldı", count: items.filter((i) => i.status === "ignored").length },
              ],
            },
            ...(languages.length > 0 ? [{
              key: "language",
              label: "Dil",
              options: languages.map((l) => ({ value: l, label: l.toUpperCase() })),
            }] : []),
            ...(categories.length > 0 ? [{
              key: "category",
              label: "Kategori",
              options: categories.map((c) => ({ value: c, label: c })),
            }] : []),
            ...(sourceMap.size > 0 ? [{
              key: "source_id",
              label: "Kaynak",
              options: Array.from(sourceMap.entries()).map(([id, name]) => ({ value: id, label: name })),
            }] : []),
          ]}
          active={filters}
          onChange={handleFilterChange}
        />
        <ColumnSelector columns={COLUMNS} visible={col.visible} onToggle={col.toggle} />
      </div>

      <BulkActionBar
        selectedCount={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          ...(onBulkDelete
            ? [{ label: "Seçilenleri Sil", variant: "danger" as const, onClick: () => { onBulkDelete(sel.selectedIds); sel.clear(); } }]
            : []),
          {
            label: "CSV Dışa Aktar",
            onClick: () => {
              const rows = filtered.filter((i) => sel.isSelected(i.id));
              const csv = ["Başlık,Durum,Kategori,Dil,Tarih", ...rows.map((i) => `"${i.title}",${i.status},${i.category ?? ""},${i.language ?? ""},${i.published_at ?? i.created_at}`)].join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "haberler.csv"; a.click();
            },
          },
        ]}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-md">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="px-3 py-2.5 border-b border-border-subtle w-8">
                <input
                  type="checkbox"
                  checked={sel.isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = sel.isIndeterminate; }}
                  onChange={sel.toggleAll}
                  className="cursor-pointer accent-brand-500"
                />
              </th>
              {col.isVisible("title") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[240px]">Başlık</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("source") && <th className="px-3 py-2.5 border-b border-border-subtle">Kaynak</th>}
              {col.isVisible("category") && <th className="px-3 py-2.5 border-b border-border-subtle">Kategori</th>}
              {col.isVisible("language") && <th className="px-3 py-2.5 border-b border-border-subtle">Dil</th>}
              {col.isVisible("date") && <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelect(item.id)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(item.id); } }}
                className={cn(
                  "border-b border-neutral-100 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-[-2px]",
                  selectedId === item.id ? "bg-info-light" : "hover:bg-neutral-50",
                  sel.isSelected(item.id) && "bg-brand-500 bg-opacity-5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.isSelected(item.id)} onChange={() => sel.toggle(item.id)} className="cursor-pointer accent-brand-500" />
                </td>
                {col.isVisible("title") && (
                  <td className={cn("px-4 py-2.5 min-w-[240px]", selectedId === item.id ? "font-semibold text-brand-700" : "font-medium text-brand-600")}>
                    <div className="truncate max-w-[400px]" title={item.title ?? ""}>{item.title ?? DASH}</div>
                  </td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusColorMap[item.status] ?? "bg-neutral-100 text-neutral-600")}>
                      {item.status ?? DASH}
                    </span>
                  </td>
                )}
                {col.isVisible("source") && (
                  <td className="px-3 py-2.5 text-neutral-600 text-sm truncate max-w-[160px]">
                    {item.source_name ?? DASH}
                  </td>
                )}
                {col.isVisible("category") && (
                  <td className="px-3 py-2.5 text-neutral-600">{item.category ?? DASH}</td>
                )}
                {col.isVisible("language") && (
                  <td className="px-3 py-2.5 text-neutral-600">{item.language?.toUpperCase() ?? DASH}</td>
                )}
                {col.isVisible("date") && (
                  <td className="px-3 py-2.5 text-neutral-500 text-sm">
                    {formatDateShort(item.published_at ?? item.created_at)}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500 text-sm">
                  Filtre kriterlerine uygun kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
