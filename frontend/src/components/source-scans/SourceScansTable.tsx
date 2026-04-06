import { cn } from "../../lib/cn";
import type { SourceScanResponse } from "../../api/sourceScansApi";
import { formatDateShort } from "../../lib/formatDate";
import { SourceScanExecutionSummary } from "./SourceScanExecutionSummary";
import { SourceScanSourceSummary } from "./SourceScanSourceSummary";
import { SourceScanResultRichnessSummary } from "./SourceScanResultRichnessSummary";
import { SourceScanPublicationYieldSummary } from "./SourceScanPublicationYieldSummary";
import { SourceScanArtifactConsistencySummary } from "./SourceScanArtifactConsistencySummary";
import { SourceScanInputQualitySummary } from "./SourceScanInputQualitySummary";
import { SourceScanTargetOutputConsistencySummary } from "./SourceScanTargetOutputConsistencySummary";
import { SourceScanPublicationOutcomeSummary } from "./SourceScanPublicationOutcomeSummary";
import { SourceScanInputSpecificitySummary } from "./SourceScanInputSpecificitySummary";

interface SourceScansTableProps {
  scans: SourceScanResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusClasses: Record<string, string> = {
  queued: "bg-warning-light text-warning-text",
  completed: "bg-success-light text-success-text",
  failed: "bg-error-light text-error-text",
};

export function SourceScansTable({ scans, selectedId, onSelect }: SourceScansTableProps) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="px-3 py-2 border-b border-border-subtle">Kaynak</th>
          <th className="px-3 py-2 border-b border-border-subtle">Tarama Modu</th>
          <th className="px-3 py-2 border-b border-border-subtle">Durum</th>
          <th className="px-3 py-2 border-b border-border-subtle">Sonuç</th>
          <th className="px-3 py-2 border-b border-border-subtle">Çalışma Özeti</th>
          <th className="px-3 py-2 border-b border-border-subtle">Çıktı Zenginliği</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Kalitesi</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Özgüllüğü</th>
          <th className="px-3 py-2 border-b border-border-subtle">Yayın Verimi</th>
          <th className="px-3 py-2 border-b border-border-subtle">Yayın Çıktısı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Artifact Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Target/Output Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {scans.map((scan) => {
          const statusCls = statusClasses[scan.status] ?? "bg-neutral-100 text-neutral-700";
          return (
            <tr
              key={scan.id}
              onClick={() => onSelect(scan.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100",
                selectedId === scan.id ? "bg-info-light" : "bg-transparent",
              )}
            >
              {/* Kimlik & Durum */}
              <td className="px-3 py-2">
                <SourceScanSourceSummary
                  sourceId={scan.source_id}
                  sourceName={scan.source_name}
                  sourceStatus={scan.source_status}
                />
              </td>
              <td className="px-3 py-2 text-neutral-600">{scan.scan_mode}</td>
              <td className="px-3 py-2">
                <span className={cn("inline-block px-2 py-0.5 rounded-full text-sm", statusCls)}>
                  {scan.status}
                </span>
              </td>
              <td className="px-3 py-2 text-neutral-600">
                {scan.result_count !== null ? scan.result_count : "—"}
              </td>
              {/* Çalışma & Çıktı */}
              <td className="px-3 py-2">
                <SourceScanExecutionSummary
                  status={scan.status}
                  resultCount={scan.result_count}
                  errorSummary={scan.error_summary}
                />
              </td>
              <td className="px-3 py-2">
                <SourceScanResultRichnessSummary
                  status={scan.status}
                  resultCount={scan.result_count}
                  errorSummary={scan.error_summary}
                  rawResultPreviewJson={scan.raw_result_preview_json}
                />
              </td>
              {/* Girdi Grubu */}
              <td className="px-3 py-2">
                <SourceScanInputQualitySummary
                  sourceId={scan.source_id}
                  scanMode={scan.scan_mode}
                  requestedBy={scan.requested_by}
                />
              </td>
              <td className="px-3 py-2">
                <SourceScanInputSpecificitySummary
                  sourceId={scan.source_id}
                  scanMode={scan.scan_mode}
                  requestedBy={scan.requested_by}
                  notes={scan.notes}
                />
              </td>
              {/* Yayın Grubu */}
              <td className="px-3 py-2">
                <SourceScanPublicationYieldSummary
                  linkedCount={scan.linked_news_count_from_scan}
                  reviewedCount={scan.reviewed_news_count_from_scan}
                  usedCount={scan.used_news_count_from_scan}
                />
              </td>
              <td className="px-3 py-2">
                <SourceScanPublicationOutcomeSummary
                  status={scan.status}
                  resultCount={scan.result_count}
                  linkedNewsCountFromScan={scan.linked_news_count_from_scan}
                  reviewedNewsCountFromScan={scan.reviewed_news_count_from_scan}
                  usedNewsCountFromScan={scan.used_news_count_from_scan}
                  errorSummary={scan.error_summary}
                />
              </td>
              {/* Tutarlılık Grubu */}
              <td className="px-3 py-2">
                <SourceScanArtifactConsistencySummary
                  sourceId={scan.source_id}
                  linkedNewsCountFromScan={scan.linked_news_count_from_scan}
                />
              </td>
              <td className="px-3 py-2">
                <SourceScanTargetOutputConsistencySummary
                  sourceId={scan.source_id}
                  resultCount={scan.result_count}
                  linkedNewsCountFromScan={scan.linked_news_count_from_scan}
                  usedNewsCountFromScan={scan.used_news_count_from_scan}
                />
              </td>
              {/* Zaman */}
              <td className="px-3 py-2 text-neutral-500 text-base">
                {formatDateShort(scan.created_at)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
