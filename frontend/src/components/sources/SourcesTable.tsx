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
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Ad</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Tür</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Durum</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Güven</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Tarama Modu</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Dil</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Taramalar</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Hazırlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Konfigürasyon</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Kalitesi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Özgüllüğü</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Haberler</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Kaynağı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target/Output Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Çıktısı</th>
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
            <td style={{ padding: "0.5rem 0.75rem", color: "#1e40af", fontWeight: selectedId === src.id ? 600 : 400 }}>
              {src.name}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{src.source_type}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <span style={{
                display: "inline-block",
                padding: "0.125rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                background: src.status === "active" ? "#dcfce7" : "#f1f5f9",
                color: src.status === "active" ? "#166534" : "#475569",
              }}>
                {src.status}
              </span>
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{src.trust_level ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{src.scan_mode ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{src.language ?? "—"}</td>
            {/* Tarama & Hazırlık */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <SourceScanSummary
                scanCount={src.scan_count}
                lastScanStatus={src.last_scan_status}
                lastScanFinishedAt={src.last_scan_finished_at}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <SourceConfigCoverageSummary
                sourceType={src.source_type}
                baseUrl={src.base_url}
                feedUrl={src.feed_url}
                apiEndpoint={src.api_endpoint}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <SourceInputQualitySummary
                sourceType={src.source_type}
                name={src.name}
                baseUrl={src.base_url}
                feedUrl={src.feed_url}
                apiEndpoint={src.api_endpoint}
                language={src.language}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <SourceLinkedNewsSummary linkedNewsCount={src.linked_news_count} />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <SourcePublicationSupplySummary
                linkedNewsCount={src.linked_news_count}
                reviewedNewsCount={src.reviewed_news_count}
                usedNewsCountFromSource={src.used_news_count_from_source}
              />
            </td>
            {/* Tutarlılık & Çıktı Grubu */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <SourceArtifactConsistencySummary
                sourceType={src.source_type}
                baseUrl={src.base_url}
                feedUrl={src.feed_url}
                apiEndpoint={src.api_endpoint}
                linkedNewsCount={src.linked_news_count}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
