import type { NewsItemResponse } from "../../api/newsItemsApi";

interface Props {
  items: NewsItemResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  new: { bg: "#dbeafe", color: "#1e40af" },
  pending: { bg: "#fef9c3", color: "#854d0e" },
  used: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

export function NewsItemsTable({ items, selectedId, onSelect }: Props) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Başlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Status</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Kaynak</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Dil</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Kategori</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Created</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const colors = statusColors[item.status] ?? { bg: "#f1f5f9", color: "#475569" };
          return (
            <tr
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                cursor: "pointer",
                background: selectedId === item.id ? "#eff6ff" : "transparent",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <td style={{ padding: "0.5rem 0.75rem", fontWeight: selectedId === item.id ? 600 : 400, maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title}
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <span style={{ display: "inline-block", padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem", background: colors.bg, color: colors.color }}>
                  {item.status}
                </span>
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontFamily: "monospace", fontSize: "0.75rem" }}>
                {item.source_id ? item.source_id.slice(0, 10) + "…" : "—"}
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{item.language ?? "—"}</td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{item.category ?? "—"}</td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontSize: "0.8rem" }}>
                {new Date(item.created_at).toLocaleDateString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
