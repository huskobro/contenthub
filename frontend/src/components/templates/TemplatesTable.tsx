import type { TemplateResponse } from "../../api/templatesApi";
import { cn } from "../../lib/cn";

const DASH = "—";

interface TemplatesTableProps {
  templates: TemplateResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TemplatesTable({ templates, selectedId, onSelect }: TemplatesTableProps) {
  if (templates.length === 0) {
    return <p className="text-neutral-500">Henuz template yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border-subtle min-w-[180px]">Ad</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Tur</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Sahip</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Modul</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>
            <th className="px-3 py-2.5 border-b border-border-subtle text-right">v</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100 transition-colors",
                selectedId === t.id ? "bg-info-light" : "hover:bg-neutral-50",
              )}
            >
              <td className={cn(
                "px-4 py-2.5 min-w-[180px]",
                selectedId === t.id ? "font-semibold text-brand-700" : "font-medium text-brand-600",
              )}>
                <div className="truncate max-w-[250px]" title={t.name ?? ""}>
                  {t.name ?? DASH}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-block px-2 py-0.5 rounded text-sm bg-neutral-100 text-neutral-700">
                  {t.template_type ?? DASH}
                </span>
              </td>
              <td className="px-3 py-2.5 text-neutral-600">{t.owner_scope ?? DASH}</td>
              <td className="px-3 py-2.5 text-neutral-600 text-sm">{t.module_scope ?? "global"}</td>
              <td className="px-3 py-2.5">
                <span className={cn(
                  "inline-block py-0.5 px-2 rounded-full text-sm",
                  t.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700",
                )}>
                  {t.status ?? DASH}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-neutral-500">{t.version ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
