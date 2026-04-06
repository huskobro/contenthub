import type { SourceResponse } from "../../api/sourcesApi";
import { SourceScanSummary } from "./SourceScanSummary";
import { SourceReadinessSummary } from "./SourceReadinessSummary";
import { SourceLinkedNewsSummary } from "./SourceLinkedNewsSummary";
import { SourceConfigCoverageSummary } from "./SourceConfigCoverageSummary";
import { SourcePublicationSupplySummary } from "./SourcePublicationSupplySummary";
import { SourceArtifactConsistencySummary } from "./SourceArtifactConsistencySummary";
import { SourceInputQualitySummary } from "./SourceInputQualitySummary";
import { SourceInputSpecificitySummary } from "./SourceInputSpecificitySummary";
import { SourceTargetOutputConsistencySummary } from "./SourceTargetOutputConsistencySummary";
import { SourcePublicationOutcomeSummary } from "./SourcePublicationOutcomeSummary";
import { cn } from "../../lib/cn";

const DASH = "—";

interface SourcesTableProps {
  sources: SourceResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SourcesTable({ sources, selectedId, onSelect }: SourcesTableProps) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="px-3 py-2 border-b border-border-subtle">Ad</th>
          <th className="px-3 py-2 border-b border-border-subtle">Tür</th>
          <th className="px-3 py-2 border-b border-border-subtle">Durum</th>
          <th className="px-3 py-2 border-b border-border-subtle">Güven</th>
          <th className="px-3 py-2 border-b border-border-subtle">Tarama Modu</th>
          <th className="px-3 py-2 border-b border-border-subtle">Dil</th>
          <th className="px-3 py-2 border-b border-border-subtle">Taramalar</th>
          <th className="px-3 py-2 border-b border-border-subtle">Hazırlık</th>
          <th className="px-3 py-2 border-b border-border-subtle">Konfigürasyon</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Kalitesi</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Özgüllüğü</th>
          <th className="px-3 py-2 border-b border-border-subtle">Haberler</th>
          <th className="px-3 py-2 border-b border-border-subtle">Yayın Kaynağı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Artifact Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Target/Output Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Yayın Çıktısı</th>
        </tr>
      </thead>
      <tbody>
        {sources.map((src) => (
          <tr
            key={src.id}
            onClick={() => onSelect(src.id)}
            className={cn(
              "cursor-pointer border-b border-neutral-100",
              selectedId === src.id ? "bg-info-light" : "hover:bg-neutral-50",
            )}
          >
            <td className={cn("px-3 py-2 text-brand-700 break-words [overflow-wrap:anywhere]", selectedId === src.id ? "font-semibold" : "font-normal")}>
              {src.name ?? DASH}
            </td>
            <td className="px-3 py-2 text-neutral-600">{src.source_type ?? DASH}</td>
            <td className="px-3 py-2">
              <span className={cn(
                "inline-block px-2 py-0.5 rounded-full text-sm",
                src.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700"
              )}>
                {src.status ?? DASH}
              </span>
            </td>
            <td className="px-3 py-2 text-neutral-600">{src.trust_level ?? DASH}</td>
            <td className="px-3 py-2 text-neutral-600">{src.scan_mode ?? DASH}</td>
            <td className="px-3 py-2 text-neutral-600">{src.language ?? DASH}</td>
            <td className="px-3 py-2">
              <SourceScanSummary scanCount={src.scan_count} lastScanStatus={src.last_scan_status} lastScanFinishedAt={src.last_scan_finished_at} />
            </td>
            <td className="px-3 py-2">
              <SourceReadinessSummary sourceType={src.source_type} status={src.status} baseUrl={src.base_url} feedUrl={src.feed_url} apiEndpoint={src.api_endpoint} scanCount={src.scan_count} lastScanStatus={src.last_scan_status} />
            </td>
            <td className="px-3 py-2">
              <SourceConfigCoverageSummary sourceType={src.source_type} baseUrl={src.base_url} feedUrl={src.feed_url} apiEndpoint={src.api_endpoint} />
            </td>
            <td className="px-3 py-2">
              <SourceInputQualitySummary sourceType={src.source_type} name={src.name} baseUrl={src.base_url} feedUrl={src.feed_url} apiEndpoint={src.api_endpoint} language={src.language} />
            </td>
            <td className="px-3 py-2">
              <SourceInputSpecificitySummary sourceType={src.source_type} name={src.name} baseUrl={src.base_url} feedUrl={src.feed_url} apiEndpoint={src.api_endpoint} language={src.language} />
            </td>
            <td className="px-3 py-2">
              <SourceLinkedNewsSummary linkedNewsCount={src.linked_news_count} />
            </td>
            <td className="px-3 py-2">
              <SourcePublicationSupplySummary linkedNewsCount={src.linked_news_count} reviewedNewsCount={src.reviewed_news_count} usedNewsCountFromSource={src.used_news_count_from_source} />
            </td>
            <td className="px-3 py-2">
              <SourceArtifactConsistencySummary sourceType={src.source_type} baseUrl={src.base_url} feedUrl={src.feed_url} apiEndpoint={src.api_endpoint} linkedNewsCount={src.linked_news_count} />
            </td>
            <td className="px-3 py-2">
              <SourceTargetOutputConsistencySummary sourceType={src.source_type} feedUrl={src.feed_url} baseUrl={src.base_url} apiEndpoint={src.api_endpoint} linkedNewsCount={src.linked_news_count} reviewedNewsCount={src.reviewed_news_count} usedNewsCountFromSource={src.used_news_count_from_source} />
            </td>
            <td className="px-3 py-2">
              <SourcePublicationOutcomeSummary linkedNewsCount={src.linked_news_count} reviewedNewsCount={src.reviewed_news_count} usedNewsCountFromSource={src.used_news_count_from_source} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
