import type { StandardVideoResponse } from "../../api/standardVideoApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateTime } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const DASH = "—";

interface Props {
  videos: StandardVideoResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  script_ready: "bg-info-light text-brand-600",
  metadata_ready: "bg-info-light text-brand-700",
  ready: "bg-success-light text-success-text",
  failed: "bg-error-light text-error-text",
};

export function StandardVideosTable({ videos, selectedId, onSelect }: Props) {
  if (videos.length === 0) {
    return <p className="text-neutral-500">Henuz standart video kaydi yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-md">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="px-4 py-2.5 border-b border-border-subtle min-w-[200px]">Baslik</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Durum</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Dil</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Sure</th>
            <th className="px-3 py-2.5 border-b border-border-subtle">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((v) => (
            <tr
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={cn(
                "cursor-pointer border-b border-neutral-100 transition-colors",
                selectedId === v.id ? "bg-info-light" : "hover:bg-neutral-50",
              )}
            >
              <td className={cn(
                "px-4 py-2.5 min-w-[200px]",
                selectedId === v.id ? "font-semibold text-brand-700" : "font-medium text-brand-600",
              )}>
                <div className="truncate max-w-[320px]" title={v.title ?? v.topic ?? ""}>
                  {v.title || v.topic || DASH}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className={cn(
                  "inline-block px-2 py-0.5 rounded-full text-sm",
                  STATUS_CLASSES[v.status] ?? "bg-neutral-100 text-neutral-600",
                )}>
                  {v.status ?? DASH}
                </span>
              </td>
              <td className="px-3 py-2.5 text-neutral-600">
                {v.language?.toUpperCase() ?? DASH}
              </td>
              <td className="px-3 py-2.5 text-neutral-600 tabular-nums">
                {v.target_duration_seconds ? formatDuration(v.target_duration_seconds) : DASH}
              </td>
              <td className="px-3 py-2.5 text-neutral-500 text-sm">
                {formatDateTime(v.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
