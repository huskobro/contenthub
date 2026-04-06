import { cn } from "../../lib/cn";
import type { SourceScanResponse } from "../../api/sourceScansApi";
import { formatDateShort } from "../../lib/formatDate";

const DASH = "—";

interface SourceScansTableProps {
  scans: SourceScanResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusClasses: Record<string, string> = {
  queued: "bg-warning-light text-warning-text",
  completed: "bg-success-light text-success-text",
  failed: "bg-error-light text-error-text",
};

export function SourceScansTable({ scans, selectedId, onSelect }: SourceScansTableProps) {
  if (scans.length === 0) {
    return <p className="text-neutral-500">Henuz tarama kaydi yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border-subtle min-w-[160px]">Kaynak</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Mod</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>
            <th className="px-3 py-2.5 border-b border-border-subtle text-right">Sonuc</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => {
            const statusCls = statusClasses[s.status] ?? "bg-neutral-100 text-neutral-600";
            return (
              <tr
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "cursor-pointer border-b border-neutral-100 transition-colors",
                  selectedId === s.id ? "bg-info-light" : "hover:bg-neutral-50",
                )}
              >
                <td className="px-4 py-2.5 font-medium text-brand-600 min-w-[160px]">
                  <div className="truncate max-w-[200px]" title={s.source_name ?? s.source_id}>
                    {s.source_name ?? s.source_id?.slice(0, 8) ?? DASH}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">
                    {s.scan_mode ?? DASH}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusCls)}>
                    {s.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                  {s.result_count ?? DASH}
                </td>
                <td className="px-3 py-2.5 text-neutral-500 text-sm">
                  {formatDateShort(s.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
