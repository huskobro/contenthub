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
import { cn } from "../../lib/cn";

const DASH = "—";

const STATUS_CLASSES: Record<string, string> = {
  draft: "text-neutral-600",
  script_ready: "text-brand-600",
  metadata_ready: "text-brand-700",
  ready: "text-success",
  failed: "text-error",
};

interface Props {
  videos: StandardVideoResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function StandardVideosTable({ videos, selectedId, onSelect }: Props) {
  if (videos.length === 0) {
    return (
      <p className="text-neutral-600 text-md">
        Henüz kayıt yok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="px-3 py-2 border-b border-border-subtle">Başlık</th>
          <th className="px-3 py-2 border-b border-border-subtle">Konu</th>
          <th className="px-3 py-2 border-b border-border-subtle">Durum</th>
          <th className="px-3 py-2 border-b border-border-subtle">Dil</th>
          <th className="px-3 py-2 border-b border-border-subtle">Hedef Süre</th>
          <th className="px-3 py-2 border-b border-border-subtle">Hazırlık</th>
          <th className="px-3 py-2 border-b border-border-subtle">Artifact</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Kalitesi</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Özgüllüğü</th>
          <th className="px-3 py-2 border-b border-border-subtle">Yayın Sinyali</th>
          <th className="px-3 py-2 border-b border-border-subtle">Artifact Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Target/Output Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {videos.map((v) => (
          <tr
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={cn(
              "cursor-pointer border-b border-neutral-100",
              selectedId === v.id ? "bg-info-light" : "hover:bg-neutral-50",
            )}
          >
            <td className="px-3 py-2 break-words [overflow-wrap:anywhere]">{v.title ?? DASH}</td>
            <td className="px-3 py-2 break-words [overflow-wrap:anywhere]">{v.topic ?? DASH}</td>
            <td className="px-3 py-2">
              <span className={cn("font-medium", STATUS_CLASSES[v.status] ?? "text-neutral-600")}>
                {v.status ?? DASH}
              </span>
            </td>
            <td className="px-3 py-2">{v.language ?? DASH}</td>
            <td className="px-3 py-2">{formatDuration(v.target_duration_seconds)}</td>
            <td className="px-3 py-2">
              <StandardVideoReadinessSummary topic={v.topic} status={v.status} />
            </td>
            <td className="px-3 py-2">
              <StandardVideoArtifactSummary hasScript={v.has_script} hasMetadata={v.has_metadata} />
            </td>
            <td className="px-3 py-2">
              <StandardVideoInputQualitySummary topic={v.topic} brief={v.brief} targetDurationSeconds={v.target_duration_seconds} language={v.language} />
            </td>
            <td className="px-3 py-2">
              <StandardVideoInputSpecificitySummary topic={v.topic} brief={v.brief} targetDurationSeconds={v.target_duration_seconds} language={v.language} />
            </td>
            <td className="px-3 py-2">
              <StandardVideoPublicationSignalSummary topic={v.topic} hasScript={v.has_script} hasMetadata={v.has_metadata} />
            </td>
            <td className="px-3 py-2">
              <StandardVideoArtifactConsistencySummary hasScript={v.has_script} hasMetadata={v.has_metadata} />
            </td>
            <td className="px-3 py-2">
              <StandardVideoTargetOutputConsistencySummary topic={v.topic} brief={v.brief} targetDurationSeconds={v.target_duration_seconds} language={v.language} hasScript={v.has_script} hasMetadata={v.has_metadata} />
            </td>
            <td className="px-3 py-2 text-neutral-500">
              {formatDateTime(v.created_at, DASH)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
