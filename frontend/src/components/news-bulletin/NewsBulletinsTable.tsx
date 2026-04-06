import { cn } from "../../lib/cn";
import type { NewsBulletinResponse } from "../../api/newsBulletinApi";
import { formatDateShort } from "../../lib/formatDate";

const DASH = "—";

interface Props {
  bulletins: NewsBulletinResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function renderModeLabel(mode: string | null | undefined): string {
  switch (mode) {
    case "per_item": return "Haber Basina";
    case "per_category": return "Kategori";
    case "combined": return "Tek";
    default: return "Tek";
  }
}

function renderModeBadge(mode: string | null | undefined): string {
  switch (mode) {
    case "per_item": return "bg-purple-100 text-purple-700";
    case "per_category": return "bg-blue-100 text-blue-700";
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

export function NewsBulletinsTable({ bulletins, selectedId, onSelect }: Props) {
  if (bulletins.length === 0) {
    return <p>Henuz news bulletin kaydi yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border-subtle min-w-[200px]">Konu</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Dil</th>
            <th className="px-3 py-2.5 border-b border-border-subtle text-right">Haber</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Render</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {bulletins.map((b) => (
            <tr
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100 transition-colors",
                selectedId === b.id ? "bg-info-light" : "hover:bg-neutral-50",
              )}
            >
              <td className={cn(
                "px-4 py-2.5 min-w-[200px]",
                selectedId === b.id ? "font-semibold text-brand-700" : "font-medium text-brand-600",
              )}>
                <div className="truncate max-w-[320px]" title={b.topic ?? ""}>
                  {b.topic ?? DASH}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusBadge(b.status))}>
                  {b.status ?? DASH}
                </span>
              </td>
              <td className="px-3 py-2.5 text-neutral-600">
                {b.language?.toUpperCase() ?? DASH}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                {b.selected_news_count ?? 0}
              </td>
              <td className="px-3 py-2.5">
                <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", renderModeBadge(b.render_mode))}>
                  {renderModeLabel(b.render_mode)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-neutral-500 text-sm">
                {formatDateShort(b.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
