import type { VisibilityRuleResponse } from "../../api/visibilityApi";

interface VisibilityRulesTableProps {
  rules: VisibilityRuleResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VisibilityRulesTable({ rules, selectedId, onSelect }: VisibilityRulesTableProps) {
  if (rules.length === 0) {
    return <p style={{ color: "#64748b" }}>Henüz kayıtlı visibility rule yok.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
          <th style={{ padding: "0.5rem" }}>rule_type</th>
          <th style={{ padding: "0.5rem" }}>target_key</th>
          <th style={{ padding: "0.5rem" }}>module_scope</th>
          <th style={{ padding: "0.5rem" }}>role_scope</th>
          <th style={{ padding: "0.5rem" }}>status</th>
          <th style={{ padding: "0.5rem" }}>priority</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((r) => (
          <tr
            key={r.id}
            onClick={() => onSelect(r.id)}
            style={{
              borderBottom: "1px solid #f1f5f9",
              cursor: "pointer",
              background: selectedId === r.id ? "#eff6ff" : "transparent",
            }}
          >
            <td style={{ padding: "0.5rem" }}>{r.rule_type}</td>
            <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{r.target_key}</td>
            <td style={{ padding: "0.5rem" }}>{r.module_scope ?? <em style={{ color: "#94a3b8" }}>—</em>}</td>
            <td style={{ padding: "0.5rem" }}>{r.role_scope ?? <em style={{ color: "#94a3b8" }}>—</em>}</td>
            <td style={{ padding: "0.5rem" }}>{r.status}</td>
            <td style={{ padding: "0.5rem" }}>{r.priority}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
