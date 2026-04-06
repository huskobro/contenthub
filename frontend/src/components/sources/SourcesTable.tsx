import { useState } from "react";
import type { SourceResponse } from "../../api/sourcesApi";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../design-system/BulkActionBar";
import { TableFilterBar } from "../design-system/TableFilterBar";
import { ColumnSelector } from "../design-system/ColumnSelector";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface SourcesTableProps {
  sources: SourceResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

function statusColor(status: string | null | undefined) {
  if (status === "active") return "bg-success-light text-success-text";
  if (status === "paused") return "bg-warning-light text-warning-text";
  return "bg-neutral-100 text-neutral-700";
}

function trustColor(trust: string | null | undefined) {
  if (trust === "high") return "text-success-text";
  if (trust === "medium") return "text-warning-text";
  if (trust === "low") return "text-error";
  return "text-neutral-500";
}

const COLUMNS = [
  { key: "name", label: "Kaynak Adı" },
  { key: "type", label: "Tür" },
  { key: "status", label: "Durum" },
  { key: "trust", label: "Güven" },
  { key: "language", label: "Dil" },
  { key: "news_count", label: "Haber" },
  { key: "last_scan", label: "Son Tarama" },
];

export function SourcesTable({ sources, selectedId, onSelect, onBulkDelete }: SourcesTableProps) {
  const [filters, setFilters] = useState<Record<string, string | null>>({
    status: null,
    source_type: null,
    trust_level: null,
  });
  const col = useColumnVisibility("sources-table", COLUMNS.map((c) => c.key));

  const filtered = sources.filter((s) => {
    if (filters.status && s.status !== filters.status) return false;
    if (filters.source_type && s.source_type !== filters.source_type) return false;
    if (filters.trust_level && s.trust_level !== filters.trust_level) return false;
    return true;
  });

  const sel = useTableSelection(filtered.map((s) => s.id));

  function handleFilterChange(key: string, value: string | null) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    sel.clear();
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
                { value: "active", label: "Aktif", count: sources.filter((s) => s.status === "active").length },
                { value: "paused", label: "Duraklatıldı", count: sources.filter((s) => s.status === "paused").length },
                { value: "archived", label: "Arşiv", count: sources.filter((s) => s.status === "archived").length },
              ],
            },
            {
              key: "source_type",
              label: "Tür",
              options: [
                { value: "rss", label: "RSS" },
                { value: "manual_url", label: "URL" },
                { value: "api", label: "API" },
              ],
            },
            {
              key: "trust_level",
              label: "Güven",
              options: [
                { value: "high", label: "Yüksek" },
                { value: "medium", label: "Orta" },
                { value: "low", label: "Düşük" },
              ],
            },
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
              const rows = filtered.filter((s) => sel.isSelected(s.id));
              const csv = ["Ad,Tür,Durum,Güven,Dil", ...rows.map((s) => `${s.name},${s.source_type},${s.status},${s.trust_level ?? ""},${s.language ?? ""}`)].join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "kaynaklar.csv"; a.click();
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
              {col.isVisible("name") && <th className="px-4 py-2.5 border-b border-border-subtle min-w-[180px]">Kaynak Adı</th>}
              {col.isVisible("type") && <th className="px-3 py-2.5 border-b border-border-subtle">Tür</th>}
              {col.isVisible("status") && <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>}
              {col.isVisible("trust") && <th className="px-3 py-2.5 border-b border-border-subtle">Güven</th>}
              {col.isVisible("language") && <th className="px-3 py-2.5 border-b border-border-subtle">Dil</th>}
              {col.isVisible("news_count") && <th className="px-3 py-2.5 border-b border-border-subtle text-right">Haber</th>}
              {col.isVisible("last_scan") && <th className="px-3 py-2.5 border-b border-border-subtle">Son Tarama</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((src) => (
              <tr
                key={src.id}
                className={cn(
                  "border-b border-neutral-100 transition-colors",
                  selectedId === src.id ? "bg-info-light" : "hover:bg-neutral-50",
                  sel.isSelected(src.id) && "bg-brand-500 bg-opacity-5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={sel.isSelected(src.id)}
                    onChange={() => sel.toggle(src.id)}
                    className="cursor-pointer accent-brand-500"
                  />
                </td>
                {col.isVisible("name") && (
                  <td
                    className={cn(
                      "px-4 py-2.5 min-w-[180px] cursor-pointer",
                      selectedId === src.id ? "font-semibold text-brand-700" : "font-medium text-brand-600",
                    )}
                    onClick={() => onSelect(src.id)}
                  >
                    <div className="truncate max-w-[280px]" title={src.name ?? ""}>{src.name ?? DASH}</div>
                  </td>
                )}
                {col.isVisible("type") && (
                  <td className="px-3 py-2.5 text-neutral-600 cursor-pointer" onClick={() => onSelect(src.id)}>
                    <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">
                      {src.source_type ?? DASH}
                    </span>
                  </td>
                )}
                {col.isVisible("status") && (
                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => onSelect(src.id)}>
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusColor(src.status))}>
                      {src.status ?? DASH}
                    </span>
                  </td>
                )}
                {col.isVisible("trust") && (
                  <td className={cn("px-3 py-2.5 font-medium cursor-pointer", trustColor(src.trust_level))} onClick={() => onSelect(src.id)}>
                    {src.trust_level ?? DASH}
                  </td>
                )}
                {col.isVisible("language") && (
                  <td className="px-3 py-2.5 text-neutral-600 cursor-pointer" onClick={() => onSelect(src.id)}>
                    {src.language?.toUpperCase() ?? DASH}
                  </td>
                )}
                {col.isVisible("news_count") && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600 cursor-pointer" onClick={() => onSelect(src.id)}>
                    {src.linked_news_count ?? 0}
                  </td>
                )}
                {col.isVisible("last_scan") && (
                  <td className="px-3 py-2.5 text-neutral-500 text-sm cursor-pointer" onClick={() => onSelect(src.id)}>
                    {src.scan_count && src.scan_count > 0 ? (
                      <span>
                        {src.last_scan_finished_at ? formatDateShort(src.last_scan_finished_at) : "Bekliyor"}
                        <span className="text-neutral-400 ml-1">({src.scan_count})</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400">Tarama yok</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-500 text-sm">
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
