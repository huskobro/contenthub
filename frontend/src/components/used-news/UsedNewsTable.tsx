import type { UsedNewsResponse } from "../../api/usedNewsApi";
import { formatDateShort } from "../../lib/formatDate";
import { UsedNewsStateSummary } from "./UsedNewsStateSummary";
import { UsedNewsSourceContextSummary } from "./UsedNewsSourceContextSummary";
import { UsedNewsPublicationLinkageSummary } from "./UsedNewsPublicationLinkageSummary";
import { UsedNewsTargetResolutionSummary } from "./UsedNewsTargetResolutionSummary";
import { UsedNewsArtifactConsistencySummary } from "./UsedNewsArtifactConsistencySummary";
import { UsedNewsInputQualitySummary } from "./UsedNewsInputQualitySummary";
import { UsedNewsInputSpecificitySummary } from "./UsedNewsInputSpecificitySummary";
import { UsedNewsTargetOutputConsistencySummary } from "./UsedNewsTargetOutputConsistencySummary";

const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

interface Props {
  records: UsedNewsResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UsedNewsTable({ records, selectedId, onSelect }: Props) {
  return (
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={TH_STYLE}>Haber ID</th>
          <th style={TH_STYLE}>Kullanım Tipi</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Kaynak Bağlamı</th>
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          <th style={TH_STYLE}>Hedef Modül</th>
          <th style={TH_STYLE}>Hedef Varlık</th>
          <th style={TH_STYLE}>Hedef Çözümü</th>
          <th style={TH_STYLE}>Yayın Bağı</th>
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
          <th style={TH_STYLE}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr
            key={record.id}
            onClick={() => onSelect(record.id)}
            style={{
              cursor: "pointer",
              background: selectedId === record.id ? "#eff6ff" : "transparent",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            {/* Kimlik & Durum */}
            <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#1e40af", fontWeight: selectedId === record.id ? 600 : 400 }}>
              {record.news_item_id}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{record.usage_type}</td>
            <td style={TD_STYLE}>
              <UsedNewsStateSummary
                usageType={record.usage_type}
                targetModule={record.target_module}
                targetEntityId={record.target_entity_id}
              />
            </td>
            <td style={TD_STYLE}>
              <UsedNewsSourceContextSummary
                newsItemId={record.news_item_id}
                hasNewsItemSource={record.has_news_item_source}
                hasNewsItemScanReference={record.has_news_item_scan_reference}
              />
            </td>
            {/* Girdi Grubu */}
            <td style={TD_STYLE}>
              <UsedNewsInputQualitySummary
                newsItemId={record.news_item_id}
                usageType={record.usage_type}
                targetModule={record.target_module}
                targetEntityId={record.target_entity_id}
                usageContext={record.usage_context}
                notes={record.notes}
              />
            </td>
            <td style={TD_STYLE}>
              <UsedNewsInputSpecificitySummary
                newsItemId={record.news_item_id}
                usageType={record.usage_type}
                targetModule={record.target_module}
                targetEntityId={record.target_entity_id}
                usageContext={record.usage_context}
                notes={record.notes}
              />
            </td>
            {/* Hedef Grubu */}
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{record.target_module}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontFamily: "monospace", fontSize: "0.8rem" }}>
              {record.target_entity_id ?? "—"}
            </td>
            <td style={TD_STYLE}>
              <UsedNewsTargetResolutionSummary
                targetModule={record.target_module}
                targetEntityId={record.target_entity_id}
                hasTargetResolved={record.has_target_resolved}
              />
            </td>
            {/* Yayın & Tutarlılık Grubu */}
            <td style={TD_STYLE}>
              <UsedNewsPublicationLinkageSummary
                usageType={record.usage_type}
                targetEntityId={record.target_entity_id}
              />
            </td>
            <td style={TD_STYLE}>
              <UsedNewsArtifactConsistencySummary
                hasNewsItemSource={record.has_news_item_source}
                hasNewsItemScanReference={record.has_news_item_scan_reference}
                hasTargetResolved={record.has_target_resolved}
                targetModule={record.target_module}
                targetEntityId={record.target_entity_id}
              />
            </td>
            <td style={TD_STYLE}>
              <UsedNewsTargetOutputConsistencySummary
                newsItemId={record.news_item_id}
                usageType={record.usage_type}
                usageContext={record.usage_context}
                notes={record.notes}
                hasTargetResolved={record.has_target_resolved}
                targetModule={record.target_module}
                targetEntityId={record.target_entity_id}
              />
            </td>
            {/* Zaman */}
            <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontSize: "0.8rem" }}>
              {formatDateShort(record.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
