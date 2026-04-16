/**
 * PHASE AA — Job preview listesi surface.
 *
 * Backend'den gelen siniflandirilmis (preview / final) entry'leri tek ekranda
 * gosterir. Ownership + visibility backend'de cozulur; frontend'de ek
 * filtreleme yapilmaz. 403 / 404 / empty dogal olarak surface'a yansitilir.
 */
import { SectionShell } from "../design-system/primitives";
import { useJobPreviews } from "../../hooks/useJobPreviews";
import { JobPreviewCard } from "./JobPreviewCard";
import type { PreviewEntry } from "../../api/previewsApi";

interface JobPreviewListProps {
  jobId: string;
  /** 'preview' veya 'final' — bos birakilirsa tumu, guruplanarak gosterilir. */
  scope?: "preview" | "final";
  /** SectionShell sarmalayicisini gizlemek icin (inline embed icin). */
  flush?: boolean;
  testId?: string;
  compactCards?: boolean;
}

const SCOPE_TITLE: Record<string, string> = {
  preview: "Onizlemeler",
  final: "Nihai Ciktilar",
  all: "Onizleme ve Nihai Ciktilar",
};

const SCOPE_DESCRIPTION: Record<string, string> = {
  preview:
    "Bu dosyalar onizleme amacli uretilmistir — nihai yayin cikti'sini temsil etmez.",
  final: "Yayinlanabilir nihai artifact'ler.",
  all: "Onizlemeler ayri rozetle isaretlenir; nihai ciktilar yesil rozet tasir.",
};

export function JobPreviewList({
  jobId,
  scope,
  flush = false,
  testId = "job-preview-list",
  compactCards = false,
}: JobPreviewListProps) {
  const { data, isLoading, isError, error } = useJobPreviews(jobId, scope);

  const headingKey = scope ?? "all";
  const Content = (() => {
    if (isLoading) {
      return <p className="text-sm text-neutral-500 m-0">Yukleniyor...</p>;
    }
    if (isError) {
      return (
        <p className="text-sm text-error m-0" data-testid={`${testId}-error`}>
          Onizlemeler yuklenemedi:
          {" "}
          {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      );
    }
    if (!data || data.entries.length === 0) {
      return (
        <p
          className="text-sm text-neutral-500 m-0 py-2"
          data-testid={`${testId}-empty`}
        >
          Bu is icin henuz gosterilecek{" "}
          {scope === "preview" ? "onizleme" : scope === "final" ? "nihai cikti" : "artifact"}{" "}
          yok.
        </p>
      );
    }

    // Scope filtrelenmemis ise preview once, sonra final blok'u ile grupla.
    if (!scope) {
      const previews = data.entries.filter((e) => e.scope === "preview");
      const finals = data.entries.filter((e) => e.scope === "final");
      return (
        <div className="flex flex-col gap-4">
          {previews.length > 0 && (
            <PreviewGroup
              heading="Onizlemeler"
              description={SCOPE_DESCRIPTION.preview}
              entries={previews}
              jobId={jobId}
              compact={compactCards}
              testId={`${testId}-group-preview`}
            />
          )}
          {finals.length > 0 && (
            <PreviewGroup
              heading="Nihai Ciktilar"
              description={SCOPE_DESCRIPTION.final}
              entries={finals}
              jobId={jobId}
              compact={compactCards}
              testId={`${testId}-group-final`}
            />
          )}
        </div>
      );
    }

    // Tek scope isteniyorsa duz liste yeterli.
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.entries.map((entry) => (
          <JobPreviewCard
            key={entry.name}
            jobId={jobId}
            entry={entry}
            compact={compactCards}
            testId={`${testId}-item-${entry.name}`}
          />
        ))}
      </div>
    );
  })();

  if (flush) {
    return (
      <div data-testid={testId}>
        {Content}
      </div>
    );
  }

  return (
    <SectionShell
      title={SCOPE_TITLE[headingKey]}
      description={data ? undefined : SCOPE_DESCRIPTION[headingKey]}
      testId={testId}
    >
      {Content}
      {data && (
        <p
          className="mt-2 text-[11px] text-neutral-400 m-0"
          data-testid={`${testId}-summary`}
        >
          Toplam {data.total} · Onizleme {data.preview_count} · Nihai{" "}
          {data.final_count}
        </p>
      )}
    </SectionShell>
  );
}

interface PreviewGroupProps {
  heading: string;
  description?: string;
  entries: PreviewEntry[];
  jobId: string;
  compact: boolean;
  testId: string;
}

function PreviewGroup({
  heading,
  description,
  entries,
  jobId,
  compact,
  testId,
}: PreviewGroupProps) {
  return (
    <div data-testid={testId} className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <h4 className="m-0 text-sm font-semibold text-neutral-700">{heading}</h4>
        <span className="text-[11px] text-neutral-500">
          ({entries.length})
        </span>
      </div>
      {description && (
        <p className="m-0 text-[11px] text-neutral-500">{description}</p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {entries.map((entry) => (
          <JobPreviewCard
            key={entry.name}
            jobId={jobId}
            entry={entry}
            compact={compact}
            testId={`${testId}-item-${entry.name}`}
          />
        ))}
      </div>
    </div>
  );
}
