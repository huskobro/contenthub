import type { UsedNewsResponse } from "../../api/usedNewsApi";
import { UsedNewsStateSummary } from "./UsedNewsStateSummary";

interface Props {
  records: UsedNewsResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UsedNewsTable({ records, selectedId, onSelect }: Props) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>News Item ID</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Usage Type</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Durum</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target Module</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target Entity ID</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Created</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr
            key={record.id}
            onClick={() => onSelect(record.id)}
            style={{
              cursor: "pointer",
              background: selectedId === record.id ? "#eff6ff" : "transparent",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#1e40af", fontWeight: selectedId === record.id ? 600 : 400 }}>
              {record.news_item_id}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{record.usage_type}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <UsedNewsStateSummary
                usageType={record.usage_type}
                targetModule={record.target_module}
                targetEntityId={record.target_entity_id}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{record.target_module}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontFamily: "monospace", fontSize: "0.8rem" }}>
              {record.target_entity_id ?? "—"}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontSize: "0.8rem" }}>
              {new Date(record.created_at).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
