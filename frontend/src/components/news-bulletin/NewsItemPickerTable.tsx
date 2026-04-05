import type { NewsItemResponse } from "../../api/newsItemsApi";
import { formatDateShort } from "../../lib/formatDate";
import { colors, radius, typography } from "../design-system/tokens";

const DASH = "—";
const TH_STYLE: React.CSSProperties = { textAlign: "left", padding: "0.375rem 0.5rem", color: colors.neutral[600], fontWeight: 500 };

interface Props {
  items: NewsItemResponse[];
  onSelect: (item: NewsItemResponse) => void;
}

export function NewsItemPickerTable({ items, onSelect }: Props) {
  if (items.length === 0) {
    return <p style={{ color: colors.neutral[500], margin: "0.5rem 0", fontSize: typography.size.md }}>Haber bulunamadı.</p>;
  }

  return (
    <table style={{ width: "100%", fontSize: typography.size.base, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: colors.neutral[50], borderBottom: `1px solid ${colors.border.subtle}` }}>
          <th style={TH_STYLE}>Başlık</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Kategori</th>
          <th style={TH_STYLE}>Dil</th>
          <th style={TH_STYLE}>Tarih</th>
          <th style={{ padding: "0.375rem 0.5rem" }}></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} style={{ borderBottom: `1px solid ${colors.neutral[100]}` }}>
            <td style={{ padding: "0.375rem 0.5rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(item.title ?? "").length > 50 ? (item.title ?? "").slice(0, 50) + "…" : (item.title ?? DASH)}
            </td>
            <td style={{ padding: "0.375rem 0.5rem", color: colors.neutral[600] }}>{item.status ?? DASH}</td>
            <td style={{ padding: "0.375rem 0.5rem", color: colors.neutral[600] }}>{item.category ?? DASH}</td>
            <td style={{ padding: "0.375rem 0.5rem", color: colors.neutral[600] }}>{item.language ?? DASH}</td>
            <td style={{ padding: "0.375rem 0.5rem", color: colors.neutral[500] }}>
              {formatDateShort(item.published_at)}
            </td>
            <td style={{ padding: "0.375rem 0.5rem" }}>
              <button
                onClick={() => onSelect(item)}
                style={{
                  padding: "0.2rem 0.6rem",
                  fontSize: typography.size.sm,
                  background: colors.brand[500],
                  color: colors.neutral[0],
                  border: "none",
                  borderRadius: radius.sm,
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
