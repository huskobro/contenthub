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
import { cn } from "../../lib/cn";

const statusColorMap: Record<string, string> = {
  new: "bg-info-light text-brand-700",
  pending: "bg-warning-light text-warning-text",
  used: "bg-success-light text-success-text",
  rejected: "bg-error-light text-error-text",
};

interface Props {
  items: NewsItemResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function NewsItemsTable({ items, selectedId, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="px-3 py-2 border-b border-border-subtle">Başlık</th>
          <th className="px-3 py-2 border-b border-border-subtle">Durum</th>
          <th className="px-3 py-2 border-b border-border-subtle">Kaynak Özeti</th>
          <th className="px-3 py-2 border-b border-border-subtle">Dil</th>
          <th className="px-3 py-2 border-b border-border-subtle">Kategori</th>
          <th className="px-3 py-2 border-b border-border-subtle">Hazırlık</th>
          <th className="px-3 py-2 border-b border-border-subtle">İçerik</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Kalitesi</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Özgüllüğü</th>
          <th className="px-3 py-2 border-b border-border-subtle">Scan Kaynağı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Kullanım</th>
          <th className="px-3 py-2 border-b border-border-subtle">Used News Bağı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Yayın Sinyali</th>
          <th className="px-3 py-2 border-b border-border-subtle">Yayın Zinciri</th>
          <th className="px-3 py-2 border-b border-border-subtle">Artifact Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Target/Output Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const statusCls = statusColorMap[item.status] ?? "bg-neutral-100 text-neutral-700";
          return (
            <tr
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100",
                selectedId === item.id ? "bg-info-light" : "hover:bg-neutral-50",
              )}
            >
              <td className={cn("px-3 py-2 max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap", selectedId === item.id ? "font-semibold" : "font-normal")}>
                {item.title}
              </td>
              <td className="px-3 py-2">
                <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusCls)}>
                  {item.status}
                </span>
              </td>
              <td className="px-3 py-2">
                <NewsItemSourceSummary
                  sourceId={item.source_id}
                  sourceName={item.source_name}
                  sourceStatus={item.source_status}
                />
              </td>
              <td className="px-3 py-2 text-neutral-600">{item.language ?? "—"}</td>
              <td className="px-3 py-2 text-neutral-600">{item.category ?? "—"}</td>
              <td className="px-3 py-2">
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
              <td className="px-3 py-2">
                <NewsItemContentCompletenessSummary
                  title={item.title}
                  url={item.url}
                  summary={item.summary}
                  language={item.language}
                  category={item.category}
                  publishedAt={item.published_at ? String(item.published_at) : null}
                />
              </td>
              <td className="px-3 py-2">
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
              <td className="px-3 py-2">
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
              <td className="px-3 py-2">
                <NewsItemScanLineageSummary
                  sourceScanId={item.source_scan_id}
                  sourceScanStatus={item.source_scan_status}
                />
              </td>
              <td className="px-3 py-2">
                <NewsItemUsageSummary
                  usageCount={item.usage_count}
                  lastUsageType={item.last_usage_type}
                  lastTargetModule={item.last_target_module}
                />
              </td>
              <td className="px-3 py-2">
                <NewsItemUsedNewsLinkageSummary
                  usageCount={item.usage_count}
                  hasPublishedUsedNewsLink={item.has_published_used_news_link}
                />
              </td>
              <td className="px-3 py-2">
                <NewsItemPublicationSignalSummary
                  status={item.status}
                  usedNewsCount={item.usage_count}
                  title={item.title}
                  summary={item.summary}
                  url={item.url}
                />
              </td>
              <td className="px-3 py-2">
                <NewsItemPublicationLineageSummary
                  usageCount={item.usage_count}
                  hasPublishedUsedNewsLink={item.has_published_used_news_link}
                />
              </td>
              <td className="px-3 py-2">
                <NewsItemArtifactConsistencySummary
                  sourceId={item.source_id}
                  sourceScanId={item.source_scan_id}
                  usageCount={item.usage_count}
                  hasPublishedUsedNewsLink={item.has_published_used_news_link}
                />
              </td>
              <td className="px-3 py-2">
                <NewsItemTargetOutputConsistencySummary
                  title={item.title}
                  url={item.url}
                  summary={item.summary}
                  usedNewsLinkCount={item.usage_count}
                  hasPublishedUsedNewsLink={item.has_published_used_news_link}
                  hasScheduledUsedNewsLink={null}
                />
              </td>
              <td className="px-3 py-2 text-neutral-500 text-base">
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
