import { colors, typography } from "../design-system/tokens";
import type { VisibilityRuleResponse } from "../../api/visibilityApi";

const DASH = "—";
const TH_STYLE: React.CSSProperties = { padding: "0.5rem" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem" };

interface VisibilityRulesTableProps {
  rules: VisibilityRuleResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VisibilityRulesTable({ rules, selectedId, onSelect }: VisibilityRulesTableProps) {
  if (rules.length === 0) {
    return <p style={{ color: colors.neutral[600] }}>Henüz kayıtlı visibility rule yok.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.md }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${colors.border.subtle}`, textAlign: "left" }}>
          <th style={TD_STYLE}>rule_type</th>
          <th style={TD_STYLE}>target_key</th>
          <th style={TD_STYLE}>module_scope</th>
          <th style={TD_STYLE}>role_scope</th>
          <th style={TD_STYLE}>status</th>
          <th style={TD_STYLE}>priority</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((r) => (
          <tr
            key={r.id}
            onClick={() => onSelect(r.id)}
            style={{
              borderBottom: `1px solid ${colors.neutral[100]}`,
              cursor: "pointer",
              background: selectedId === r.id ? colors.info.light : "transparent",
            }}
          >
            <td style={TD_STYLE}>{r.rule_type ?? DASH}</td>
            <td style={{ padding: "0.5rem", fontFamily: "monospace", wordBreak: "break-all", overflowWrap: "anywhere" }}>{r.target_key ?? DASH}</td>
            <td style={TD_STYLE}>{r.module_scope ?? <em style={{ color: colors.neutral[500] }}>—</em>}</td>
            <td style={TD_STYLE}>{r.role_scope ?? <em style={{ color: colors.neutral[500] }}>—</em>}</td>
            <td style={TD_STYLE}>{r.status ?? DASH}</td>
            <td style={TD_STYLE}>{r.priority ?? DASH}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
