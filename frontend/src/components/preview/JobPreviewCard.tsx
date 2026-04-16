/**
 * PHASE AA — Tek bir preview / final artifact'i gosteren kart.
 *
 * Rules:
 *   - scope 'preview' ise cok net "Onizleme — nihai degil" rozeti gosterilir.
 *   - scope 'final' ise "Nihai" rozeti gosterilir.
 *   - Media type'a gore MediaPreview delegasyonu yapilir (video/image/audio/json/text).
 *   - Indirme yolu mevcut /jobs/{id}/artifacts/{path} endpoint'inden gelir;
 *     parallel bir serve yolu yoktur.
 */
import type { PreviewEntry } from "../../api/previewsApi";
import { buildArtifactDownloadUrl } from "../../api/previewsApi";
import { MediaPreview } from "../shared/MediaPreview";

interface JobPreviewCardProps {
  jobId: string;
  entry: PreviewEntry;
  compact?: boolean;
  testId?: string;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimestamp(epoch: number | null): string {
  if (!epoch) return "";
  try {
    return new Date(epoch * 1000).toLocaleString();
  } catch {
    return "";
  }
}

function ScopeBadge({ scope }: { scope: "preview" | "final" }) {
  if (scope === "preview") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-warning bg-warning-light px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning-dark"
        data-testid="preview-scope-badge"
        title="Bu dosya bir onizlemedir — nihai cikti degildir."
      >
        Onizleme
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-success bg-success-light px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-success-dark"
      data-testid="final-scope-badge"
    >
      Nihai
    </span>
  );
}

export function JobPreviewCard({
  jobId,
  entry,
  compact = false,
  testId,
}: JobPreviewCardProps) {
  const url = buildArtifactDownloadUrl(jobId, entry);
  const label = entry.label ?? entry.name;
  const dataTestId = testId ?? `preview-card-${entry.name}`;

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface p-3"
      data-testid={dataTestId}
      data-scope={entry.scope}
      data-kind={entry.kind}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ScopeBadge scope={entry.scope} />
        <span className="text-sm font-semibold text-neutral-700 truncate" title={entry.name}>
          {label}
        </span>
        <span className="ml-auto text-[11px] font-mono text-neutral-400">
          {entry.kind}
        </span>
      </div>

      {entry.scope === "preview" && (
        <p
          className="m-0 text-[11px] text-warning-dark"
          data-testid="preview-warning-text"
        >
          Bu dosya yalnizca bir onizlemedir — yayinlanacak nihai cikti degildir.
        </p>
      )}

      <MediaPreview
        src={url}
        title={compact ? undefined : entry.name}
        compact={compact}
        testId={`${dataTestId}-media`}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        <span className="font-mono truncate" title={entry.path}>
          {entry.path}
        </span>
        {entry.source_step && (
          <span>
            Adim: <span className="font-mono">{entry.source_step}</span>
          </span>
        )}
        {entry.size_bytes !== null && <span>{formatBytes(entry.size_bytes)}</span>}
        {entry.modified_at_epoch !== null && (
          <span>{formatTimestamp(entry.modified_at_epoch)}</span>
        )}
        <a
          href={url}
          download={entry.name}
          className="ml-auto text-brand-600 hover:underline"
          data-testid={`${dataTestId}-download`}
        >
          Indir
        </a>
      </div>
    </div>
  );
}
