/**
 * ExportButton — Gate 5 C2.
 *
 * Drop-in CSV export button for any analytics section. Given a report
 * kind and optional filter params, fetches the CSV from
 * /analytics/export?kind=... and triggers a browser download.
 *
 * Visual language: compact, outline-style; shows "İndiriliyor…" while
 * loading and an error banner if the request fails. Matches the existing
 * design-system palette (amber/red tones for states).
 */

import { useAnalyticsExport } from "../../hooks/useAnalyticsExport";
import type {
  AnalyticsExportKind,
  AnalyticsExportParams,
} from "../../api/analyticsExportApi";
import { cn } from "../../lib/cn";

interface ExportButtonProps {
  kind: AnalyticsExportKind;
  /** Filter params copied into the request. Undefined keys are dropped. */
  params?: Omit<AnalyticsExportParams, "kind">;
  /** Button label. Defaults to "CSV olarak indir". */
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function ExportButton({
  kind,
  params,
  label = "CSV olarak indir",
  className,
  disabled,
}: ExportButtonProps) {
  const { state, error, exportCsv, reset } = useAnalyticsExport();

  const handleClick = () => {
    if (state === "loading") return;
    void exportCsv({ kind, ...(params ?? {}) });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1" data-testid={`export-${kind}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === "loading"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        aria-label={label}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        {state === "loading" ? "İndiriliyor…" : label}
      </button>
      {state === "error" && (
        <div
          role="alert"
          data-testid={`export-error-${kind}`}
          className="flex items-center gap-2 text-xs text-red-700"
        >
          <span>CSV indirilemedi: {error ?? "Bilinmeyen hata"}</span>
          <button
            type="button"
            onClick={reset}
            className="underline hover:no-underline"
          >
            Kapat
          </button>
        </div>
      )}
    </div>
  );
}
