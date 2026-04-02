import type { StandardVideoResponse } from "../../api/standardVideoApi";
import { formatDuration } from "../../lib/formatDuration";
import { StandardVideoReadinessSummary } from "./StandardVideoReadinessSummary";
import { StandardVideoArtifactSummary } from "./StandardVideoArtifactSummary";
import { StandardVideoPublicationSignalSummary } from "./StandardVideoPublicationSignalSummary";
import { StandardVideoInputQualitySummary } from "./StandardVideoInputQualitySummary";
import { StandardVideoArtifactConsistencySummary } from "./StandardVideoArtifactConsistencySummary";
import { StandardVideoInputSpecificitySummary } from "./StandardVideoInputSpecificitySummary";
import { StandardVideoTargetOutputConsistencySummary } from "./StandardVideoTargetOutputConsistencySummary";

interface Props {
  videos: StandardVideoResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#64748b",
  script_ready: "#2563eb",
  metadata_ready: "#7c3aed",
  ready: "#16a34a",
  failed: "#dc2626",
};

export function StandardVideosTable({ videos, selectedId, onSelect }: Props) {
  if (videos.length === 0) {
    return (
      <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
        Henüz kayıt yok.
      </p>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f8fafc", textAlign: "left" }}>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Başlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Konu</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Durum</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Hazırlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Sinyali</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Kalitesi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Özgüllüğü</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target/Output Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Dil</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Hedef Süre</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {videos.map((v) => (
          <tr
            key={v.id}
            onClick={() => onSelect(v.id)}
            style={{
              cursor: "pointer",
              background: selectedId === v.id ? "#eff6ff" : "transparent",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <td style={{ padding: "0.5rem 0.75rem" }}>{v.title ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{v.topic}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <span
                style={{
                  color: STATUS_COLORS[v.status] ?? "#64748b",
                  fontWeight: 500,
                }}
              >
                {v.status}
              </span>
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StandardVideoReadinessSummary
                topic={v.topic}
                status={v.status}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StandardVideoArtifactSummary
                hasScript={v.has_script}
                hasMetadata={v.has_metadata}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StandardVideoPublicationSignalSummary
                topic={v.topic}
                hasScript={v.has_script}
                hasMetadata={v.has_metadata}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StandardVideoInputQualitySummary
                topic={v.topic}
                brief={v.brief}
                targetDurationSeconds={v.target_duration_seconds}
                language={v.language}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StandardVideoArtifactConsistencySummary
                hasScript={v.has_script}
                hasMetadata={v.has_metadata}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StandardVideoInputSpecificitySummary
                topic={v.topic}
                brief={v.brief}
                targetDurationSeconds={v.target_duration_seconds}
                language={v.language}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StandardVideoTargetOutputConsistencySummary
                topic={v.topic}
                brief={v.brief}
                targetDurationSeconds={v.target_duration_seconds}
                language={v.language}
                hasScript={v.has_script}
                hasMetadata={v.has_metadata}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{v.language ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              {formatDuration(v.target_duration_seconds)}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8" }}>
              {new Date(v.created_at).toLocaleString("tr-TR")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
