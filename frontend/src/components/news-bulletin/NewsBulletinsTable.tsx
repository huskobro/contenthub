import { useState } from "react";
import { cn } from "../../lib/cn";
import type { NewsBulletinResponse } from "../../api/newsBulletinApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDateShort } from "../../lib/formatDate";

const DASH = "—";

interface Props {
  bulletins: NewsBulletinResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

function renderModeLabel(mode: string | null | undefined): string {
  switch (mode) {
    case "per_item": return "Haber Başına";
    case "per_category": return "Kategori";
    case "combined": return "Tek";
    default: return "Tek";
  }
}

function renderModeBadge(mode: string | null | undefined): string {
  switch (mode) {
    case "per_item": return "bg-info-light text-info-dark";
    case "per_category": return "bg-info-light text-info-dark";
    default: return "bg-neutral-100 text-neutral-600";
  }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-600",
    selection_confirmed: "bg-info-light text-brand-700",
    in_progress: "bg-warning-light text-warning-text",
    rendering: "bg-warning-light text-warning-text",
    done: "bg-success-light text-success-text",
    failed: "bg-error-light text-error-text",
  };
  return map[status] ?? "bg-neutral-100 text-neutral-600";
}

const COLUMNS = [
  { key: "topic", label: "Konu" },
  { key: "status", label: "Durum" },
  { key: "language", label: "Dil" },
  { key: "news_count", label: "Haber" },
  { key: "render_mode", label: "Render" },
  { key: "date", label: "Tarih" },
];

export function NewsBulletinsTable({ bulletins, selectedId, onSelect, onBulkDelete }: Props) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ status: null, language: null });
  const col = useColumnVisibility("news-bulletins-table", COLUMNS.map((c) => c.key));

  const filtered = bulletins.filter((b) => {
    if (filters.status && b.status !== filters.status) return false;
    if (filters.language && b.language !== filters.language) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((b) => b.id));

  function handleFilterChange(key: string, value: string | null) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    sel.clear();
  }

  const languages = Array.from(new Set(bulletins.map((b) => b.language).filter(Boolean))) as string[];

  if (bulletins.length === 0) return <p>Henüz news bulletin kaydı yok.</p>;

  return (
    <div>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <TableFilterBar
          groups={[
            {
              key: "status",
              label: "Durum",
              options: [
                { value: "draft", label: "Taslak", count: bulletins.filter((b) => b.status === "draft").length },
                { value: "selection_confirmed", label: "Onaylı", count: bulletins.filter((b) => b.status === "selection_confirmed").length },
                { value: "rendering", label: "İşleniyor", count: bulletins.filter((b) => b.status === "rendering").length },
                { value: "done", label: "Tamamlandı", count: bulletins.filter((b) => b.status === "done").length },
                { value: "failed", label: "Başarısız", count: bulletins.filter((b) => b.status === "failed").length },
              ],
            },
            ...(languages.length > 0 ? [{
              key: "language",
              label: "Dil",
              options: languages.map((l) => ({ value: l, label: l.toUpperCase() })),
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
          ...(onBulkDelete ? [{ label: "Seçilenleri Sil", variant: "danger" as const, onClick: () => { onBulkDelete(sel.selectedIds); sel.clear(); } }] : []),
          {
            label: "CSV Dışa Aktar",
            onClick: () => {
              const rows = filtered.filter((b) => sel.isSelected(b.id));
              const csv = ["Konu,Durum,Dil,Haber Sayısı,Tarih", ...rows.map((b) => `"${b.topic}",${b.status},${b.language ?? ""},${b.selected_news_count ?? 0},${b.created_at}`)].join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "bultenler.csv"; a.click();
            },
          },
        ]}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-md">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="px-3 py-2.5 border-b border-border-subtle w-8">
                <input type="checkbox" checked={sel.isAllSelected} ref={(el) => { if (el) el.indeterminate = sel.isIndeterminate; }} onChange={sel.toggleAll} className="cursor-pointer accent-brand-500" />
              </th>
              {col.isVisible("topic") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[200px]">Konu</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("language") && <th className="px-3 py-2.5 border-b border-border-subtle">Dil</th>}
              {col.isVisible("news_count") && <th className="px-3 py-2.5 border-b border-border-subtle text-right">Haber</th>}
              {col.isVisible("render_mode") && <th className="px-3 py-2.5 border-b border-border-subtle">Render</th>}
              {col.isVisible("date") && <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} onClick={() => onSelect(b.id)} tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(b.id); } }} className={cn("border-b border-neutral-100 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-[-2px]", selectedId === b.id ? "bg-info-light" : "hover:bg-neutral-50", sel.isSelected(b.id) && "bg-brand-500 bg-opacity-5")}>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.isSelected(b.id)} onChange={() => sel.toggle(b.id)} className="cursor-pointer accent-brand-500" />
                </td>
                {col.isVisible("topic") && (
                  <td className={cn("px-4 py-2.5 min-w-[200px]", selectedId === b.id ? "font-semibold text-brand-700" : "font-medium text-brand-600")}>
                    <div className="truncate max-w-[320px]" title={b.topic ?? ""}>{b.topic ?? DASH}</div>
                  </td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusBadge(b.status))}>{b.status ?? DASH}</span>
                  </td>
                )}
                {col.isVisible("language") && (
                  <td className="px-3 py-2.5 text-neutral-600">{b.language?.toUpperCase() ?? DASH}</td>
                )}
                {col.isVisible("news_count") && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">{b.selected_news_count ?? 0}</td>
                )}
                {col.isVisible("render_mode") && (
                  <td className="px-3 py-2.5">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", renderModeBadge(b.render_mode))}>{renderModeLabel(b.render_mode)}</span>
                  </td>
                )}
                {col.isVisible("date") && (
                  <td className="px-3 py-2.5 text-neutral-500 text-sm">{formatDateShort(b.created_at)}</td>
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
