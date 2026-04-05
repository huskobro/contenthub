import type { StandardVideoResponse } from "../../api/standardVideoApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateTime } from "../../lib/formatDate";
import { StandardVideoReadinessSummary } from "./StandardVideoReadinessSummary";
import { StandardVideoArtifactSummary } from "./StandardVideoArtifactSummary";
import { StandardVideoPublicationSignalSummary } from "./StandardVideoPublicationSignalSummary";
import { StandardVideoInputQualitySummary } from "./StandardVideoInputQualitySummary";
import { StandardVideoArtifactConsistencySummary } from "./StandardVideoArtifactConsistencySummary";
import { StandardVideoInputSpecificitySummary } from "./StandardVideoInputSpecificitySummary";
import { StandardVideoTargetOutputConsistencySummary } from "./StandardVideoTargetOutputConsistencySummary";
import { colors, typography } from "../design-system/tokens";

const DASH = "—";
const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: `1px solid ${colors.border.subtle}` };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

interface Props {
  videos: StandardVideoResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: colors.neutral[600],
  script_ready: colors.brand[600],
  metadata_ready: colors.brand[700],
  ready: colors.success.base,
  failed: colors.error.base,
};

export function StandardVideosTable({ videos, selectedId, onSelect }: Props) {
  if (videos.length === 0) {
    return (
      <p style={{ color: colors.neutral[600], fontSize: typography.size.md }}>
        Henüz kayıt yok.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.md }}>
      <thead>
        <tr style={{ background: colors.neutral[100], textAlign: "left" }}>
          {/* Kimlik & Durum */}
          <th style={TH_STYLE}>Başlık</th>
          <th style={TH_STYLE}>Konu</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Dil</th>
          <th style={TH_STYLE}>Hedef Süre</th>
          {/* Hazırlık & İçerik */}
          <th style={TH_STYLE}>Hazırlık</th>
          <th style={TH_STYLE}>Artifact</th>
          {/* Girdi */}
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          {/* Yayın */}
          <th style={TH_STYLE}>Yayın Sinyali</th>
          {/* Tutarlılık */}
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
          {/* Zaman */}
          <th style={TH_STYLE}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {videos.map((v) => (
          <tr
            key={v.id}
            onClick={() => onSelect(v.id)}
            style={{
              cursor: "pointer",
              background: selectedId === v.id ? colors.info.light : "transparent",
              borderBottom: `1px solid ${colors.neutral[100]}`,
            }}
          >
            {/* Kimlik & Durum */}
            <td style={{ padding: "0.5rem 0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{v.title ?? DASH}</td>
            <td style={{ padding: "0.5rem 0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{v.topic ?? DASH}</td>
            <td style={TD_STYLE}>
              <span
                style={{
                  color: STATUS_COLORS[v.status] ?? colors.neutral[600],
                  fontWeight: 500,
                }}
              >
                {v.status ?? DASH}
              </span>
            </td>
            <td style={TD_STYLE}>{v.language ?? DASH}</td>
            <td style={TD_STYLE}>
              {formatDuration(v.target_duration_seconds)}
            </td>
            {/* Hazırlık & İçerik */}
            <td style={TD_STYLE}>
              <StandardVideoReadinessSummary
                topic={v.topic}
                status={v.status}
              />
            </td>
            <td style={TD_STYLE}>
              <StandardVideoArtifactSummary
                hasScript={v.has_script}
                hasMetadata={v.has_metadata}
              />
            </td>
            {/* Girdi */}
            <td style={TD_STYLE}>
              <StandardVideoInputQualitySummary
                topic={v.topic}
                brief={v.brief}
                targetDurationSeconds={v.target_duration_seconds}
                language={v.language}
              />
            </td>
            <td style={TD_STYLE}>
              <StandardVideoInputSpecificitySummary
                topic={v.topic}
                brief={v.brief}
                targetDurationSeconds={v.target_duration_seconds}
                language={v.language}
              />
            </td>
            {/* Yayın */}
            <td style={TD_STYLE}>
              <StandardVideoPublicationSignalSummary
                topic={v.topic}
                hasScript={v.has_script}
                hasMetadata={v.has_metadata}
              />
            </td>
            {/* Tutarlılık */}
            <td style={TD_STYLE}>
              <StandardVideoArtifactConsistencySummary
                hasScript={v.has_script}
                hasMetadata={v.has_metadata}
              />
            </td>
            <td style={TD_STYLE}>
              <StandardVideoTargetOutputConsistencySummary
                topic={v.topic}
                brief={v.brief}
                targetDurationSeconds={v.target_duration_seconds}
                language={v.language}
                hasScript={v.has_script}
                hasMetadata={v.has_metadata}
              />
            </td>
            {/* Zaman */}
            <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[500] }}>
              {formatDateTime(v.created_at, DASH)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
