import { cn } from "../../lib/cn";
import type { TemplateStyleLinkResponse } from "../../api/templateStyleLinksApi";
import { formatDateShort } from "../../lib/formatDate";
import { TemplateStyleLinkReadinessSummary } from "./TemplateStyleLinkReadinessSummary";

interface TemplateStyleLinksTableProps {
  links: TemplateStyleLinkResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-success text-neutral-0",
  inactive: "bg-neutral-600 text-neutral-0",
  archived: "bg-neutral-500 text-neutral-0",
};

export function TemplateStyleLinksTable({
  links,
  selectedId,
  onSelect,
}: TemplateStyleLinksTableProps) {
  return (
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-50 border-b border-border-subtle">
          <th className="text-left px-3 py-2 font-semibold text-neutral-700">
            Template ID
          </th>
          <th className="text-left px-3 py-2 font-semibold text-neutral-700">
            Blueprint ID
          </th>
          <th className="text-left px-3 py-2 font-semibold text-neutral-700">
            Role
          </th>
          <th className="text-left px-3 py-2 font-semibold text-neutral-700">
            Status
          </th>
          <th className="text-left px-3 py-2 font-semibold text-neutral-700">
            Bağ Durumu
          </th>
          <th className="text-left px-3 py-2 font-semibold text-neutral-700">
            Created
          </th>
        </tr>
      </thead>
      <tbody>
        {links.map((link) => (
          <tr
            key={link.id}
            onClick={() => onSelect(link.id)}
            className={cn(
              "cursor-pointer border-b border-neutral-100",
              selectedId === link.id ? "bg-info-light" : "bg-transparent",
            )}
          >
            <td className="px-3 py-2 text-neutral-900 font-mono text-base">
              {link.template_id.slice(0, 8)}…
            </td>
            <td className="px-3 py-2 text-neutral-900 font-mono text-base">
              {link.style_blueprint_id.slice(0, 8)}…
            </td>
            <td className="px-3 py-2 text-neutral-700">
              {link.link_role ?? "—"}
            </td>
            <td className="px-3 py-2">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-sm font-semibold",
                STATUS_CLASSES[link.status] ?? "bg-neutral-500 text-neutral-0",
              )}>
                {link.status ?? "—"}
              </span>
            </td>
            <td className="px-3 py-2">
              <TemplateStyleLinkReadinessSummary
                status={link.status}
                linkRole={link.link_role}
                templateId={link.template_id}
                styleBlueprintId={link.style_blueprint_id}
              />
            </td>
            <td className="px-3 py-2 text-neutral-600 text-base">
              {formatDateShort(link.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
