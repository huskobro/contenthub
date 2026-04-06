import type { VisibilityRuleResponse } from "../../api/visibilityApi";
import { cn } from "../../lib/cn";

const DASH = "—";

interface VisibilityRulesTableProps {
  rules: VisibilityRuleResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VisibilityRulesTable({ rules, selectedId, onSelect }: VisibilityRulesTableProps) {
  if (rules.length === 0) {
    return <p className="text-neutral-600">Henüz kayıtlı visibility rule yok.</p>;
  }

  return (
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="border-b-2 border-border-subtle text-left">
          <th className="p-2">rule_type</th>
          <th className="p-2">target_key</th>
          <th className="p-2">module_scope</th>
          <th className="p-2">role_scope</th>
          <th className="p-2">status</th>
          <th className="p-2">priority</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((r) => (
          <tr
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              "border-b border-neutral-100 cursor-pointer",
              selectedId === r.id ? "bg-info-light" : "bg-transparent"
            )}
          >
            <td className="p-2">{r.rule_type ?? DASH}</td>
            <td className="p-2 font-mono break-all [overflow-wrap:anywhere]">{r.target_key ?? DASH}</td>
            <td className="p-2">{r.module_scope ?? <em className="text-neutral-500">—</em>}</td>
            <td className="p-2">{r.role_scope ?? <em className="text-neutral-500">—</em>}</td>
            <td className="p-2">{r.status ?? DASH}</td>
            <td className="p-2">{r.priority ?? DASH}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
