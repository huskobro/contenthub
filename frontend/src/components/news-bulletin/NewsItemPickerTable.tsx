import { cn } from "../../lib/cn";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import { formatDateShort } from "../../lib/formatDate";

const DASH = "—";

interface Props {
  items: NewsItemResponse[];
  onSelect: (item: NewsItemResponse) => void;
}

export function NewsItemPickerTable({ items, onSelect }: Props) {
  if (items.length === 0) {
    return <p className="text-neutral-500 my-2 text-md">Haber bulunamadı.</p>;
  }

  return (
    <table className="w-full text-base border-collapse">
      <thead>
        <tr className="bg-neutral-50 border-b border-border-subtle">
          <th className="text-left px-2 py-1.5 text-neutral-600 font-medium">Başlık</th>
          <th className="text-left px-2 py-1.5 text-neutral-600 font-medium">Durum</th>
          <th className="text-left px-2 py-1.5 text-neutral-600 font-medium">Kategori</th>
          <th className="text-left px-2 py-1.5 text-neutral-600 font-medium">Dil</th>
          <th className="text-left px-2 py-1.5 text-neutral-600 font-medium">Tarih</th>
          <th className="px-2 py-1.5"></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-neutral-100">
            <td className="px-2 py-1.5 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
              {(item.title ?? "").length > 50 ? (item.title ?? "").slice(0, 50) + "…" : (item.title ?? DASH)}
            </td>
            <td className="px-2 py-1.5 text-neutral-600">{item.status ?? DASH}</td>
            <td className="px-2 py-1.5 text-neutral-600">{item.category ?? DASH}</td>
            <td className="px-2 py-1.5 text-neutral-600">{item.language ?? DASH}</td>
            <td className="px-2 py-1.5 text-neutral-500">
              {formatDateShort(item.published_at)}
            </td>
            <td className="px-2 py-1.5">
              <button
                onClick={() => onSelect(item)}
                className="px-2.5 py-0.5 text-sm bg-brand-500 text-neutral-0 border-none rounded-sm cursor-pointer"
              >
                Seç
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
