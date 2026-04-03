import type { NewsItemResponse } from "../../api/newsItemsApi";
import { formatDateShort } from "../../lib/formatDate";

interface Props {
  items: NewsItemResponse[];
  onSelect: (item: NewsItemResponse) => void;
}

export function NewsItemPickerTable({ items, onSelect }: Props) {
  if (items.length === 0) {
    return <p style={{ color: "#94a3b8", margin: "0.5rem 0", fontSize: "0.875rem" }}>Haber bulunamadı.</p>;
  }

  return (
    <table style={{ width: "100%", fontSize: "0.8125rem", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Başlık</th>
          <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Durum</th>
          <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Kategori</th>
          <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Dil</th>
          <th style={{ textAlign: "left", padding: "0.375rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Tarih</th>
          <th style={{ padding: "0.375rem 0.5rem" }}></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "0.375rem 0.5rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.title.length > 50 ? item.title.slice(0, 50) + "…" : item.title}
            </td>
            <td style={{ padding: "0.375rem 0.5rem", color: "#64748b" }}>{item.status}</td>
            <td style={{ padding: "0.375rem 0.5rem", color: "#64748b" }}>{item.category ?? "—"}</td>
            <td style={{ padding: "0.375rem 0.5rem", color: "#64748b" }}>{item.language ?? "—"}</td>
            <td style={{ padding: "0.375rem 0.5rem", color: "#94a3b8" }}>
              {formatDateShort(item.published_at)}
            </td>
            <td style={{ padding: "0.375rem 0.5rem" }}>
              <button
                onClick={() => onSelect(item)}
                style={{
                  padding: "0.2rem 0.6rem",
                  fontSize: "0.75rem",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
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
