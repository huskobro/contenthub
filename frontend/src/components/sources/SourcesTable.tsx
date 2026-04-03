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

const DASH = "—";
const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

interface SourcesTableProps {
  sources: SourceResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SourcesTable({ sources, selectedId, onSelect }: SourcesTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={TH_STYLE}>Ad</th>
          <th style={TH_STYLE}>Tür</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Güven</th>
          <th style={TH_STYLE}>Tarama Modu</th>
          <th style={TH_STYLE}>Dil</th>
          <th style={TH_STYLE}>Taramalar</th>
          <th style={TH_STYLE}>Hazırlık</th>
          <th style={TH_STYLE}>Konfigürasyon</th>
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          <th style={TH_STYLE}>Haberler</th>
          <th style={TH_STYLE}>Yayın Kaynağı</th>
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
          <th style={TH_STYLE}>Yayın Çıktısı</th>
        </tr>
      </thead>
      <tbody>
        {sources.map((src) => (
          <tr
            key={src.id}
            onClick={() => onSelect(src.id)}
            style={{
              cursor: "pointer",
              background: selectedId === src.id ? "#eff6ff" : "transparent",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            {/* Kimlik */}
            <td style={{ padding: "0.5rem 0.75rem", color: "#1e40af", fontWeight: selectedId === src.id ? 600 : 400, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {src.name ?? DASH}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{src.source_type ?? DASH}</td>
            <td style={TD_STYLE}>
              <span style={{
                display: "inline-block",
                padding: "0.125rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                background: src.status === "active" ? "#dcfce7" : "#f1f5f9",
                color: src.status === "active" ? "#166534" : "#475569",
              }}>
                {src.status ?? DASH}
              </span>
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{src.trust_level ?? DASH}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{src.scan_mode ?? DASH}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{src.language ?? DASH}</td>
            {/* Tarama & Hazırlık */}
            <td style={TD_STYLE}>
              <SourceScanSummary
                scanCount={src.scan_count}
                lastScanStatus={src.last_scan_status}
                lastScanFinishedAt={src.last_scan_finished_at}
              />
            </td>
            <td style={TD_STYLE}>
              <SourceReadinessSummary
                sourceType={src.source_type}
                status={src.status}
                baseUrl={src.base_url}
                feedUrl={src.feed_url}
                apiEndpoint={src.api_endpoint}
                scanCount={src.scan_count}
                lastScanStatus={src.last_scan_status}
              />
            </td>
            {/* Girdi Grubu */}
            <td style={TD_STYLE}>
              <SourceConfigCoverageSummary
                sourceType={src.source_type}
                baseUrl={src.base_url}
                feedUrl={src.feed_url}
                apiEndpoint={src.api_endpoint}
              />
            </td>
            <td style={TD_STYLE}>
              <SourceInputQualitySummary
                sourceType={src.source_type}
                name={src.name}
                baseUrl={src.base_url}
                feedUrl={src.feed_url}
                apiEndpoint={src.api_endpoint}
                language={src.language}
              />
            </td>
            <td style={TD_STYLE}>
              <SourceInputSpecificitySummary
                sourceType={src.source_type}
                name={src.name}
                baseUrl={src.base_url}
                feedUrl={src.feed_url}
                apiEndpoint={src.api_endpoint}
                language={src.language}
              />
            </td>
            {/* Haber & Yayın Grubu */}
            <td style={TD_STYLE}>
              <SourceLinkedNewsSummary linkedNewsCount={src.linked_news_count} />
            </td>
            <td style={TD_STYLE}>
              <SourcePublicationSupplySummary
                linkedNewsCount={src.linked_news_count}
                reviewedNewsCount={src.reviewed_news_count}
                usedNewsCountFromSource={src.used_news_count_from_source}
              />
            </td>
            {/* Tutarlılık & Çıktı Grubu */}
            <td style={TD_STYLE}>
              <SourceArtifactConsistencySummary
                sourceType={src.source_type}
                baseUrl={src.base_url}
                feedUrl={src.feed_url}
                apiEndpoint={src.api_endpoint}
                linkedNewsCount={src.linked_news_count}
              />
            </td>
            <td style={TD_STYLE}>
              <SourceTargetOutputConsistencySummary
                sourceType={src.source_type}
                feedUrl={src.feed_url}
                baseUrl={src.base_url}
                apiEndpoint={src.api_endpoint}
                linkedNewsCount={src.linked_news_count}
                reviewedNewsCount={src.reviewed_news_count}
                usedNewsCountFromSource={src.used_news_count_from_source}
              />
            </td>
            <td style={TD_STYLE}>
              <SourcePublicationOutcomeSummary
                linkedNewsCount={src.linked_news_count}
                reviewedNewsCount={src.reviewed_news_count}
                usedNewsCountFromSource={src.used_news_count_from_source}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
