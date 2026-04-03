import type { SourceScanResponse } from "../../api/sourceScansApi";
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

const statusColors: Record<string, { bg: string; color: string }> = {
  queued: { bg: "#fef9c3", color: "#854d0e" },
  completed: { bg: "#dcfce7", color: "#166534" },
  failed: { bg: "#fee2e2", color: "#991b1b" },
};

export function SourceScansTable({ scans, selectedId, onSelect }: SourceScansTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Kaynak</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Tarama Modu</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Durum</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Sonuç</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Çalışma Özeti</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Çıktı Zenginliği</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Kalitesi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Özgüllüğü</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Verimi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Çıktısı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target/Output Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {scans.map((scan) => {
          const colors = statusColors[scan.status] ?? { bg: "#f1f5f9", color: "#475569" };
          return (
            <tr
              key={scan.id}
              onClick={() => onSelect(scan.id)}
              style={{
                cursor: "pointer",
                background: selectedId === scan.id ? "#eff6ff" : "transparent",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              {/* Kimlik & Durum */}
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <SourceScanSourceSummary
                  sourceId={scan.source_id}
                  sourceName={scan.source_name}
                  sourceStatus={scan.source_status}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{scan.scan_mode}</td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <span style={{
                  display: "inline-block",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  background: colors.bg,
                  color: colors.color,
                }}>
                  {scan.status}
                </span>
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>
                {scan.result_count !== null ? scan.result_count : "—"}
              </td>
              {/* Çalışma & Çıktı */}
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <SourceScanExecutionSummary
                  status={scan.status}
                  resultCount={scan.result_count}
                  errorSummary={scan.error_summary}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <SourceScanResultRichnessSummary
                  status={scan.status}
                  resultCount={scan.result_count}
                  errorSummary={scan.error_summary}
                  rawResultPreviewJson={scan.raw_result_preview_json}
                />
              </td>
              {/* Girdi Grubu */}
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <SourceScanInputQualitySummary
                  sourceId={scan.source_id}
                  scanMode={scan.scan_mode}
                  requestedBy={scan.requested_by}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <SourceScanInputSpecificitySummary
                  sourceId={scan.source_id}
                  scanMode={scan.scan_mode}
                  requestedBy={scan.requested_by}
                  notes={scan.notes}
                />
              </td>
              {/* Yayın Grubu */}
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <SourceScanPublicationYieldSummary
                  linkedCount={scan.linked_news_count_from_scan}
                  reviewedCount={scan.reviewed_news_count_from_scan}
                  usedCount={scan.used_news_count_from_scan}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
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
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <SourceScanArtifactConsistencySummary
                  sourceId={scan.source_id}
                  linkedNewsCountFromScan={scan.linked_news_count_from_scan}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem" }}>
                <SourceScanTargetOutputConsistencySummary
                  sourceId={scan.source_id}
                  resultCount={scan.result_count}
                  linkedNewsCountFromScan={scan.linked_news_count_from_scan}
                  usedNewsCountFromScan={scan.used_news_count_from_scan}
                />
              </td>
              {/* Zaman */}
              <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontSize: "0.8rem" }}>
                {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
