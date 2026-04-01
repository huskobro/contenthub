import type { StandardVideoResponse } from "../../api/standardVideoApi";
import { formatDuration } from "../../lib/formatDuration";

interface Props {
  video: StandardVideoResponse;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td
        style={{
          padding: "0.375rem 0.75rem",
          color: "#64748b",
          fontWeight: 500,
          fontSize: "0.8125rem",
          whiteSpace: "nowrap",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem" }}>{value ?? "—"}</td>
    </tr>
  );
}

export function StandardVideoOverviewPanel({ video }: Props) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        background: "#fff",
        marginBottom: "1.25rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.625rem 0.75rem",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        Genel Bilgi
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Row label="ID" value={<code style={{ fontSize: "0.8125rem" }}>{video.id}</code>} />
          <Row label="Başlık" value={video.title} />
          <Row label="Konu" value={video.topic} />
          <Row label="Brief" value={video.brief} />
          <Row label="Hedef Süre" value={formatDuration(video.target_duration_seconds)} />
          <Row label="Ton" value={video.tone} />
          <Row label="Dil" value={video.language} />
          <Row label="Görsel Yön" value={video.visual_direction} />
          <Row label="Altyazı Stili" value={video.subtitle_style} />
          <Row label="Durum" value={video.status} />
          <Row label="Job ID" value={video.job_id} />
          <Row label="Oluşturulma" value={new Date(video.created_at).toLocaleString("tr-TR")} />
          <Row label="Güncelleme" value={new Date(video.updated_at).toLocaleString("tr-TR")} />
        </tbody>
      </table>
    </div>
  );
}
