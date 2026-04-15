/**
 * useAnalyticsExport — Gate 5 C2.
 *
 * Imperative hook for triggering a CSV download of any analytics report
 * kind. Wraps fetchAnalyticsCsv in a state machine (idle/loading/error)
 * so callers can render a button without tracking state manually.
 */

import { useCallback, useState } from "react";
import {
  fetchAnalyticsCsv,
  type AnalyticsExportKind,
  type AnalyticsExportParams,
} from "../api/analyticsExportApi";

type ExportState = "idle" | "loading" | "error";

interface UseAnalyticsExportReturn {
  state: ExportState;
  error: string | null;
  exportCsv: (params: AnalyticsExportParams) => Promise<void>;
  reset: () => void;
}

function triggerDownload(csv: string, filename: string): void {
  // Prepend BOM so Excel reads UTF-8 correctly on Windows.
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function buildFilename(kind: AnalyticsExportKind, params: AnalyticsExportParams): string {
  const parts = [`analytics-${kind}`];
  if (params.window) parts.push(params.window);
  if (params.date_from) parts.push(params.date_from);
  if (params.date_to) parts.push(params.date_to);
  const stamp = new Date().toISOString().slice(0, 10);
  return `${parts.join("_")}_${stamp}.csv`;
}

export function useAnalyticsExport(): UseAnalyticsExportReturn {
  const [state, setState] = useState<ExportState>("idle");
  const [error, setError] = useState<string | null>(null);

  const exportCsv = useCallback(async (params: AnalyticsExportParams) => {
    setState("loading");
    setError(null);
    try {
      const csv = await fetchAnalyticsCsv(params);
      triggerDownload(csv, buildFilename(params.kind, params));
      setState("idle");
    } catch (exc) {
      const message = exc instanceof Error ? exc.message : String(exc);
      setError(message);
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  return { state, error, exportCsv, reset };
}
