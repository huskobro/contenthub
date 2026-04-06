import type { NewsItemResponse } from "../../api/newsItemsApi";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface Props {
  items: NewsItemResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusColorMap: Record<string, string> = {
  new: "bg-info-light text-brand-700",
  pending: "bg-warning-light text-warning-text",
  used: "bg-success-light text-success-text",
  rejected: "bg-error-light text-error-text",
  ignored: "bg-neutral-100 text-neutral-500",
};

export function NewsItemsTable({ items, selectedId, onSelect }: Props) {
  if (items.length === 0) {
    return <p className="text-neutral-500">Henuz haber kaydi yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border-subtle min-w-[240px]">Baslik</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Kategori</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Dil</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100 transition-colors",
                selectedId === item.id ? "bg-info-light" : "hover:bg-neutral-50",
              )}
            >
              <td className={cn(
                "px-4 py-2.5 min-w-[240px]",
                selectedId === item.id ? "font-semibold text-brand-700" : "font-medium text-brand-600",
              )}>
                <div className="truncate max-w-[400px]" title={item.title ?? ""}>
                  {item.title ?? DASH}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className={cn(
                  "inline-block px-2 py-0.5 rounded-full text-sm",
                  statusColorMap[item.status] ?? "bg-neutral-100 text-neutral-600",
                )}>
                  {item.status ?? DASH}
                </span>
              </td>
              <td className="px-3 py-2.5 text-neutral-600">
                {item.category ?? DASH}
              </td>
              <td className="px-3 py-2.5 text-neutral-600">
                {item.language?.toUpperCase() ?? DASH}
              </td>
              <td className="px-3 py-2.5 text-neutral-500 text-sm">
                {formatDateShort(item.published_at ?? item.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
