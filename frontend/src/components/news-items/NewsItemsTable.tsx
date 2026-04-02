import type { NewsItemResponse } from "../../api/newsItemsApi";
import { NewsItemUsageSummary } from "./NewsItemUsageSummary";
import { NewsItemReadinessSummary } from "./NewsItemReadinessSummary";
import { NewsItemSourceSummary } from "./NewsItemSourceSummary";
import { NewsItemScanLineageSummary } from "./NewsItemScanLineageSummary";
import { NewsItemContentCompletenessSummary } from "./NewsItemContentCompletenessSummary";

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
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Kaynak Özeti</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Dil</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Kategori</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Kullanım</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Hazırlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Scan Kaynağı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>İçerik</th>
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
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <NewsItemSourceSummary
                  sourceId={item.source_id}
                  sourceName={item.source_name}
                  sourceStatus={item.source_status}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{item.language ?? "—"}</td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{item.category ?? "—"}</td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <NewsItemUsageSummary
                  usageCount={item.usage_count}
                  lastUsageType={item.last_usage_type}
                  lastTargetModule={item.last_target_module}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <NewsItemReadinessSummary
                  title={item.title}
                  url={item.url}
                  status={item.status}
                  sourceId={item.source_id}
                  usageCount={item.usage_count}
                  lastUsageType={item.last_usage_type}
                  lastTargetModule={item.last_target_module}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <NewsItemScanLineageSummary
                  sourceScanId={item.source_scan_id}
                  sourceScanStatus={item.source_scan_status}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <NewsItemContentCompletenessSummary
                  title={item.title}
                  url={item.url}
                  summary={item.summary}
                  language={item.language}
                  category={item.category}
                  publishedAt={item.published_at ? String(item.published_at) : null}
                />
              </td>
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
