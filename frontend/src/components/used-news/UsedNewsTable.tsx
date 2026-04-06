import type { UsedNewsResponse } from "../../api/usedNewsApi";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface Props {
  records: UsedNewsResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UsedNewsTable({ records, selectedId, onSelect }: Props) {
  if (records.length === 0) {
    return <p className="text-neutral-500">Henuz kullanilmis haber kaydi yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border-subtle min-w-[120px]">Haber ID</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Kullanim Tipi</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Hedef Modul</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Hedef Varlik</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100 transition-colors",
                selectedId === r.id ? "bg-info-light" : "hover:bg-neutral-50",
              )}
            >
              <td className="px-4 py-2.5 font-mono text-sm text-brand-600">
                {r.news_item_id?.slice(0, 8) ?? DASH}
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">
                  {r.usage_type ?? DASH}
                </span>
              </td>
              <td className="px-3 py-2.5 text-neutral-600">{r.target_module ?? DASH}</td>
              <td className="px-3 py-2.5 font-mono text-sm text-neutral-500">
                {r.target_entity_id?.slice(0, 8) ?? DASH}
              </td>
              <td className="px-3 py-2.5 text-neutral-500 text-sm">
                {formatDateShort(r.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
