import type { StandardVideoResponse } from "../../api/standardVideoApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";

const DASH = "—";

interface Props {
  video: StandardVideoResponse;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const display = typeof value === "string" && isBlank(value) ? DASH : (value ?? DASH);
  return (
    <tr>
      <td className="px-3 py-1.5 text-neutral-600 font-medium text-base whitespace-nowrap align-top">
        {label}
      </td>
      <td className="px-3 py-1.5 text-md break-words [overflow-wrap:anywhere]">{display}</td>
    </tr>
  );
}

export function StandardVideoOverviewPanel({ video }: Props) {
  return (
    <div className="border border-border-subtle rounded-md bg-neutral-0 mb-5 overflow-hidden">
      <div className="px-3 py-2.5 bg-neutral-50 border-b border-border-subtle font-semibold text-md">
        Genel Bilgi
      </div>
      <table className="w-full border-collapse">
        <tbody>
          <Row label="ID" value={<code className="text-base">{video.id}</code>} />
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
