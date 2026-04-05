import type { StandardVideoResponse } from "../../api/standardVideoApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import { colors, radius, typography } from "../design-system/tokens";

const DASH = "—";

interface Props {
  video: StandardVideoResponse;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const display = typeof value === "string" && isBlank(value) ? DASH : (value ?? DASH);
  return (
    <tr>
      <td
        style={{
          padding: "0.375rem 0.75rem",
          color: colors.neutral[600],
          fontWeight: 500,
          fontSize: typography.size.base,
          whiteSpace: "nowrap",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td style={{ padding: "0.375rem 0.75rem", fontSize: typography.size.md, wordBreak: "break-word", overflowWrap: "anywhere" }}>{display}</td>
    </tr>
  );
}

export function StandardVideoOverviewPanel({ video }: Props) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.md,
        background: colors.neutral[0],
        marginBottom: "1.25rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.625rem 0.75rem",
          background: colors.neutral[50],
          borderBottom: `1px solid ${colors.border.subtle}`,
          fontWeight: 600,
          fontSize: typography.size.md,
        }}
      >
        Genel Bilgi
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Row label="ID" value={<code style={{ fontSize: typography.size.base }}>{video.id}</code>} />
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
          <Row label="Oluşturulma" value={formatDateTime(video.created_at, DASH)} />
          <Row label="Güncelleme" value={formatDateTime(video.updated_at, DASH)} />
        </tbody>
      </table>
    </div>
  );
}
