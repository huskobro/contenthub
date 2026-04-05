import type { NewsItemResponse } from "../../api/newsItemsApi";
import { formatDateShort } from "../../lib/formatDate";
import { NewsItemUsageSummary } from "./NewsItemUsageSummary";
import { NewsItemReadinessSummary } from "./NewsItemReadinessSummary";
import { NewsItemSourceSummary } from "./NewsItemSourceSummary";
import { NewsItemScanLineageSummary } from "./NewsItemScanLineageSummary";
import { NewsItemContentCompletenessSummary } from "./NewsItemContentCompletenessSummary";
import { NewsItemPublicationSignalSummary } from "./NewsItemPublicationSignalSummary";
import { NewsItemUsedNewsLinkageSummary } from "./NewsItemUsedNewsLinkageSummary";
import { NewsItemPublicationLineageSummary } from "./NewsItemPublicationLineageSummary";
import { NewsItemArtifactConsistencySummary } from "./NewsItemArtifactConsistencySummary";
import { NewsItemInputQualitySummary } from "./NewsItemInputQualitySummary";
import { NewsItemInputSpecificitySummary } from "./NewsItemInputSpecificitySummary";
import { NewsItemTargetOutputConsistencySummary } from "./NewsItemTargetOutputConsistencySummary";
import { colors, radius, typography } from "../design-system/tokens";

const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: `1px solid ${colors.border.subtle}` };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

interface Props {
  items: NewsItemResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  new: { bg: colors.info.light, color: colors.brand[700] },
  pending: { bg: colors.warning.light, color: colors.warning.text },
  used: { bg: colors.success.light, color: colors.success.text },
  rejected: { bg: colors.error.light, color: colors.error.text },
};

export function NewsItemsTable({ items, selectedId, onSelect }: Props) {
  return (
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.md }}>
      <thead>
        <tr style={{ background: colors.neutral[100], textAlign: "left" }}>
          <th style={TH_STYLE}>Başlık</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Kaynak Özeti</th>
          <th style={TH_STYLE}>Dil</th>
          <th style={TH_STYLE}>Kategori</th>
          <th style={TH_STYLE}>Hazırlık</th>
          <th style={TH_STYLE}>İçerik</th>
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          <th style={TH_STYLE}>Scan Kaynağı</th>
          <th style={TH_STYLE}>Kullanım</th>
          <th style={TH_STYLE}>Used News Bağı</th>
          <th style={TH_STYLE}>Yayın Sinyali</th>
          <th style={TH_STYLE}>Yayın Zinciri</th>
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
          <th style={TH_STYLE}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const statusClr = statusColors[item.status] ?? { bg: colors.neutral[100], color: colors.neutral[700] };
          return (
            <tr
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                cursor: "pointer",
                background: selectedId === item.id ? colors.info.light : "transparent",
                borderBottom: `1px solid ${colors.neutral[100]}`,
              }}
            >
              {/* Kimlik & Durum */}
              <td style={{ padding: "0.5rem 0.75rem", fontWeight: selectedId === item.id ? 600 : 400, maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title}
              </td>
              <td style={TD_STYLE}>
                <span style={{ display: "inline-block", padding: "0.125rem 0.5rem", borderRadius: radius.full, fontSize: typography.size.sm, background: statusClr.bg, color: statusClr.color }}>
                  {item.status}
                </span>
              </td>
              <td style={TD_STYLE}>
                <NewsItemSourceSummary
                  sourceId={item.source_id}
                  sourceName={item.source_name}
                  sourceStatus={item.source_status}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[600] }}>{item.language ?? "—"}</td>
              <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[600] }}>{item.category ?? "—"}</td>
              {/* Hazırlık & İçerik */}
              <td style={TD_STYLE}>
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
              <td style={TD_STYLE}>
                <NewsItemContentCompletenessSummary
                  title={item.title}
                  url={item.url}
                  summary={item.summary}
                  language={item.language}
                  category={item.category}
                  publishedAt={item.published_at ? String(item.published_at) : null}
                />
              </td>
              {/* Girdi Grubu */}
              <td style={TD_STYLE}>
                <NewsItemInputQualitySummary
                  title={item.title}
                  url={item.url}
                  summary={item.summary}
                  sourceId={item.source_id}
                  sourceScanId={item.source_scan_id}
                  language={item.language}
                  category={item.category}
                  publishedAt={item.published_at ? String(item.published_at) : null}
                />
              </td>
              <td style={TD_STYLE}>
                <NewsItemInputSpecificitySummary
                  title={item.title}
                  url={item.url}
                  summary={item.summary}
                  sourceId={item.source_id}
                  sourceScanId={item.source_scan_id}
                  language={item.language}
                  category={item.category}
                  publishedAt={item.published_at ? String(item.published_at) : null}
                />
              </td>
              {/* Lineage & Kullanım Grubu */}
              <td style={TD_STYLE}>
                <NewsItemScanLineageSummary
                  sourceScanId={item.source_scan_id}
                  sourceScanStatus={item.source_scan_status}
                />
              </td>
              <td style={TD_STYLE}>
                <NewsItemUsageSummary
                  usageCount={item.usage_count}
                  lastUsageType={item.last_usage_type}
                  lastTargetModule={item.last_target_module}
                />
              </td>
              <td style={TD_STYLE}>
                <NewsItemUsedNewsLinkageSummary
                  usageCount={item.usage_count}
                  hasPublishedUsedNewsLink={item.has_published_used_news_link}
                />
              </td>
              {/* Yayın Grubu */}
              <td style={TD_STYLE}>
                <NewsItemPublicationSignalSummary
                  status={item.status}
                  usedNewsCount={item.usage_count}
                  title={item.title}
                  summary={item.summary}
                  url={item.url}
                />
              </td>
              <td style={TD_STYLE}>
                <NewsItemPublicationLineageSummary
                  usageCount={item.usage_count}
                  hasPublishedUsedNewsLink={item.has_published_used_news_link}
                />
              </td>
              {/* Tutarlılık Grubu */}
              <td style={TD_STYLE}>
                <NewsItemArtifactConsistencySummary
                  sourceId={item.source_id}
                  sourceScanId={item.source_scan_id}
                  usageCount={item.usage_count}
                  hasPublishedUsedNewsLink={item.has_published_used_news_link}
                />
              </td>
              <td style={TD_STYLE}>
                <NewsItemTargetOutputConsistencySummary
                  title={item.title}
                  url={item.url}
                  summary={item.summary}
                  usedNewsLinkCount={item.usage_count}
                  hasPublishedUsedNewsLink={item.has_published_used_news_link}
                  hasScheduledUsedNewsLink={null}
                />
              </td>
              {/* Zaman */}
              <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[500], fontSize: typography.size.base }}>
                {formatDateShort(item.created_at)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
