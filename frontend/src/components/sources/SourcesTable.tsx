import type { SourceResponse } from "../../api/sourcesApi";
import { cn } from "../../lib/cn";

const DASH = "—";

interface SourcesTableProps {
  sources: SourceResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Badge renk secici */
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

export function SourcesTable({ sources, selectedId, onSelect }: SourcesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border-subtle min-w-[180px]">Kaynak Adi</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Tur</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Guven</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Dil</th>
            <th className="px-3 py-2.5 border-b border-border-subtle text-right">Haber</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Son Tarama</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((src) => (
            <tr
              key={src.id}
              onClick={() => onSelect(src.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100 transition-colors",
                selectedId === src.id ? "bg-info-light" : "hover:bg-neutral-50",
              )}
            >
              {/* Ad — genisletilmis, okunabilir */}
              <td className={cn(
                "px-4 py-2.5 min-w-[180px]",
                selectedId === src.id ? "font-semibold text-brand-700" : "font-medium text-brand-600",
              )}>
                <div className="truncate max-w-[280px]" title={src.name ?? ""}>
                  {src.name ?? DASH}
                </div>
              </td>

              {/* Tur */}
              <td className="px-3 py-2.5 text-neutral-600">
                <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">
                  {src.source_type ?? DASH}
                </span>
              </td>

              {/* Durum */}
              <td className="px-3 py-2.5">
                <span className={cn(
                  "inline-block px-2 py-0.5 rounded-full text-sm",
                  statusColor(src.status),
                )}>
                  {src.status ?? DASH}
                </span>
              </td>

              {/* Guven */}
              <td className={cn("px-3 py-2.5 font-medium", trustColor(src.trust_level))}>
                {src.trust_level ?? DASH}
              </td>

              {/* Dil */}
              <td className="px-3 py-2.5 text-neutral-600">
                {src.language?.toUpperCase() ?? DASH}
              </td>

              {/* Haber sayisi */}
              <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                {src.linked_news_count ?? 0}
              </td>

              {/* Son Tarama */}
              <td className="px-3 py-2.5 text-neutral-500 text-sm">
                {src.scan_count && src.scan_count > 0 ? (
                  <span>
                    {src.last_scan_finished_at
                      ? new Date(src.last_scan_finished_at).toLocaleDateString("tr-TR")
                      : "Bekliyor"}
                    <span className="text-neutral-400 ml-1">({src.scan_count})</span>
                  </span>
                ) : (
                  <span className="text-neutral-400">Tarama yok</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
