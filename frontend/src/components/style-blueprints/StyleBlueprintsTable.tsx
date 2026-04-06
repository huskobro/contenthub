import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface StyleBlueprintsTableProps {
  blueprints: StyleBlueprintResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function StyleBlueprintsTable({ blueprints, selectedId, onSelect }: StyleBlueprintsTableProps) {
  if (blueprints.length === 0) {
    return <p className="text-neutral-500">Henuz style blueprint yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border-subtle min-w-[180px]">Ad</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Modul</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>
            <th className="px-3 py-2.5 border-b border-border-subtle text-right">v</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {blueprints.map((bp) => (
            <tr
              key={bp.id}
              onClick={() => onSelect(bp.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100 transition-colors",
                selectedId === bp.id ? "bg-info-light" : "hover:bg-neutral-50",
              )}
            >
              <td className={cn(
                "px-4 py-2.5 min-w-[180px]",
                selectedId === bp.id ? "font-semibold text-brand-700" : "font-medium text-brand-600",
              )}>
                <div className="truncate max-w-[250px]" title={bp.name ?? ""}>
                  {bp.name ?? DASH}
                </div>
              </td>
              <td className="px-3 py-2.5 text-neutral-600 text-sm">{bp.module_scope ?? "global"}</td>
              <td className="px-3 py-2.5">
                <span className={cn(
                  "inline-block py-0.5 px-2 rounded-full text-sm",
                  bp.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700",
                )}>
                  {bp.status ?? DASH}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-neutral-500">{bp.version ?? 0}</td>
              <td className="px-3 py-2.5 text-neutral-500 text-sm">
                {formatDateShort(bp.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
