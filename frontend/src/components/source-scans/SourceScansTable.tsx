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
import { colors, radius, typography } from "../design-system/tokens";

const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: `1px solid ${colors.border.subtle}` };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

interface SourceScansTableProps {
  scans: SourceScanResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  queued: { bg: colors.warning.light, color: colors.warning.text },
  completed: { bg: colors.success.light, color: colors.success.text },
  failed: { bg: colors.error.light, color: colors.error.text },
};

export function SourceScansTable({ scans, selectedId, onSelect }: SourceScansTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.md }}>
      <thead>
        <tr style={{ background: colors.neutral[100], textAlign: "left" }}>
          <th style={TH_STYLE}>Kaynak</th>
          <th style={TH_STYLE}>Tarama Modu</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Sonuç</th>
          <th style={TH_STYLE}>Çalışma Özeti</th>
          <th style={TH_STYLE}>Çıktı Zenginliği</th>
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          <th style={TH_STYLE}>Yayın Verimi</th>
          <th style={TH_STYLE}>Yayın Çıktısı</th>
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
          <th style={TH_STYLE}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {scans.map((scan) => {
          const statusClr = statusColors[scan.status] ?? { bg: colors.neutral[100], color: colors.neutral[700] };
          return (
            <tr
              key={scan.id}
              onClick={() => onSelect(scan.id)}
              style={{
                cursor: "pointer",
                background: selectedId === scan.id ? colors.info.light : "transparent",
                borderBottom: `1px solid ${colors.neutral[100]}`,
              }}
            >
              {/* Kimlik & Durum */}
              <td style={TD_STYLE}>
                <SourceScanSourceSummary
                  sourceId={scan.source_id}
                  sourceName={scan.source_name}
                  sourceStatus={scan.source_status}
                />
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[600] }}>{scan.scan_mode}</td>
              <td style={TD_STYLE}>
                <span style={{
                  display: "inline-block",
                  padding: "0.125rem 0.5rem",
                  borderRadius: radius.full,
                  fontSize: typography.size.sm,
                  background: statusClr.bg,
                  color: statusClr.color,
                }}>
                  {scan.status}
                </span>
              </td>
              <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[600] }}>
                {scan.result_count !== null ? scan.result_count : "—"}
              </td>
              {/* Çalışma & Çıktı */}
              <td style={TD_STYLE}>
                <SourceScanExecutionSummary
                  status={scan.status}
                  resultCount={scan.result_count}
                  errorSummary={scan.error_summary}
                />
              </td>
              <td style={TD_STYLE}>
                <SourceScanResultRichnessSummary
                  status={scan.status}
                  resultCount={scan.result_count}
                  errorSummary={scan.error_summary}
                  rawResultPreviewJson={scan.raw_result_preview_json}
                />
              </td>
              {/* Girdi Grubu */}
              <td style={TD_STYLE}>
                <SourceScanInputQualitySummary
                  sourceId={scan.source_id}
                  scanMode={scan.scan_mode}
                  requestedBy={scan.requested_by}
                />
              </td>
              <td style={TD_STYLE}>
                <SourceScanInputSpecificitySummary
                  sourceId={scan.source_id}
                  scanMode={scan.scan_mode}
                  requestedBy={scan.requested_by}
                  notes={scan.notes}
                />
              </td>
              {/* Yayın Grubu */}
              <td style={TD_STYLE}>
                <SourceScanPublicationYieldSummary
                  linkedCount={scan.linked_news_count_from_scan}
                  reviewedCount={scan.reviewed_news_count_from_scan}
                  usedCount={scan.used_news_count_from_scan}
                />
              </td>
              <td style={TD_STYLE}>
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
              <td style={TD_STYLE}>
                <SourceScanArtifactConsistencySummary
                  sourceId={scan.source_id}
                  linkedNewsCountFromScan={scan.linked_news_count_from_scan}
                />
              </td>
              <td style={TD_STYLE}>
                <SourceScanTargetOutputConsistencySummary
                  sourceId={scan.source_id}
                  resultCount={scan.result_count}
                  linkedNewsCountFromScan={scan.linked_news_count_from_scan}
                  usedNewsCountFromScan={scan.used_news_count_from_scan}
                />
              </td>
              {/* Zaman */}
              <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[500], fontSize: typography.size.base }}>
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
