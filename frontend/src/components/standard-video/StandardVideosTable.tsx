import { useState } from "react";
import type { StandardVideoResponse } from "../../api/standardVideoApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface Props {
  videos: StandardVideoResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  script_ready: "bg-info-light text-brand-600",
  metadata_ready: "bg-info-light text-brand-700",
  ready: "bg-success-light text-success-text",
  failed: "bg-error-light text-error-text",
};

const COLUMNS = [
  { key: "title", label: "Başlık" },
  { key: "status", label: "Durum" },
  { key: "language", label: "Dil" },
  { key: "duration", label: "Süre" },
  { key: "date", label: "Tarih" },
];

export function StandardVideosTable({ videos, selectedId, onSelect, onBulkDelete }: Props) {
  const [filters, setFilters] = useState<Record<string, string | null>>({ status: null, language: null });
  const col = useColumnVisibility("standard-videos-table", COLUMNS.map((c) => c.key));

  const languages = Array.from(new Set(videos.map((v) => v.language).filter(Boolean))) as string[];

  const filtered = videos.filter((v) => {
    if (filters.status && v.status !== filters.status) return false;
    if (filters.language && v.language !== filters.language) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((v) => v.id));

  if (videos.length === 0) {
    return <p className="text-neutral-500">Henüz standart video kaydı yok.</p>;
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
                { value: "draft", label: "Taslak", count: videos.filter((v) => v.status === "draft").length },
                { value: "script_ready", label: "Senaryo Hazır", count: videos.filter((v) => v.status === "script_ready").length },
                { value: "ready", label: "Hazır", count: videos.filter((v) => v.status === "ready").length },
                { value: "failed", label: "Başarısız", count: videos.filter((v) => v.status === "failed").length },
              ],
            },
            ...(languages.length > 0 ? [{
              key: "language",
              label: "Dil",
              options: languages.map((l) => ({ value: l, label: l.toUpperCase() })),
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
          {
            label: "CSV Dışa Aktar",
            onClick: () => {
              const rows = filtered.filter((v) => sel.isSelected(v.id));
              const csv = ["Başlık,Durum,Dil,Süre,Tarih", ...rows.map((v) => `"${v.title ?? v.topic ?? ""}",${v.status},${v.language ?? ""},${v.target_duration_seconds ?? ""},${v.created_at}`)].join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "videolar.csv"; a.click();
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
              {col.isVisible("title") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[200px]">Başlık</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("language") && <th className="px-3 py-2.5 border-b border-border-subtle">Dil</th>}
              {col.isVisible("duration") && <th className="px-3 py-2.5 border-b border-border-subtle">Süre</th>}
              {col.isVisible("date") && <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr
                key={v.id}
                className={cn(
                  "border-b border-neutral-100 transition-colors",
                  selectedId === v.id ? "bg-info-light" : "hover:bg-neutral-50",
                  sel.isSelected(v.id) && "bg-brand-500 bg-opacity-5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.isSelected(v.id)} onChange={() => sel.toggle(v.id)} className="cursor-pointer accent-brand-500" />
                </td>
                {col.isVisible("title") && (
                  <td className={cn("px-4 py-2.5 min-w-[200px] cursor-pointer", selectedId === v.id ? "font-semibold text-brand-700" : "font-medium text-brand-600")} onClick={() => onSelect(v.id)}>
                    <div className="truncate max-w-[320px]" title={v.title ?? v.topic ?? ""}>{v.title || v.topic || DASH}</div>
                  </td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => onSelect(v.id)}>
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", STATUS_CLASSES[v.status] ?? "bg-neutral-100 text-neutral-600")}>{v.status ?? DASH}</span>
                  </td>
                )}
                {col.isVisible("language") && (
                  <td className="px-3 py-2.5 text-neutral-600 cursor-pointer" onClick={() => onSelect(v.id)}>{v.language?.toUpperCase() ?? DASH}</td>
                )}
                {col.isVisible("duration") && (
                  <td className="px-3 py-2.5 text-neutral-600 tabular-nums cursor-pointer" onClick={() => onSelect(v.id)}>
                    {v.target_duration_seconds ? formatDuration(v.target_duration_seconds) : DASH}
                  </td>
                )}
                {col.isVisible("date") && (
                  <td className="px-3 py-2.5 text-neutral-500 text-sm cursor-pointer" onClick={() => onSelect(v.id)}>
                    {formatDateShort(v.created_at)}
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
