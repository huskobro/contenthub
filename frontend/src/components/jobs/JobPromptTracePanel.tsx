/**
 * JobPromptTracePanel — shows prompt assembly trace for a completed job.
 * Lists runs, shows block breakdown, prompt, payloads, and snapshots.
 */

import { useState, type ReactNode, type MouseEvent } from "react";
import { usePromptTracesForJob, usePromptTraceDetail } from "../../hooks/usePromptTrace";
import { BlockBreakdownView } from "../prompt-assembly/BlockBreakdownView";
import { cn } from "../../lib/cn";

// ── Collapsible helper ──

function Collapsible({
  title,
  defaultOpen = false,
  children,
  copyText,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  copyText?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  function handleCopy(e: MouseEvent) {
    e.stopPropagation();
    if (!copyText) return;
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden mb-2">
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-inset hover:bg-neutral-100 transition-colors text-left"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-neutral-800">{title}</span>
        <div className="flex items-center gap-2">
          {copyText && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleCopy}
              onKeyDown={(e) => e.key === "Enter" && handleCopy(e as unknown as MouseEvent)}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium px-1.5 py-0.5 rounded transition-colors"
            >
              {copied ? "Kopyalandı!" : "Kopyala"}
            </span>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={cn("transition-transform text-neutral-500", open ? "rotate-180" : "")}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

// ── Run detail view ──

function RunDetailView({ runId }: { runId: string }) {
  const { data: detail, isLoading, isError } = usePromptTraceDetail(runId);

  if (isLoading) {
    return (
      <p className="text-neutral-500 text-sm py-2" data-testid="run-detail-loading">
        Yükleniyor...
      </p>
    );
  }

  if (isError || !detail) {
    return (
      <p className="text-error text-sm py-2" data-testid="run-detail-error">
        Trace detayı yüklenemedi.
      </p>
    );
  }

  const finalPayload = (() => {
    try {
      return JSON.parse(detail.final_payload_json) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

  const providerResponse = (() => {
    if (!detail.provider_response_json) return null;
    try {
      return JSON.parse(detail.provider_response_json) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

  const providerError = (() => {
    if (!detail.provider_error_json) return null;
    try {
      return JSON.parse(detail.provider_error_json) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

  const settingsSnapshot = (() => {
    try {
      return JSON.parse(detail.settings_snapshot_json) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

  const dataSnapshot = (() => {
    try {
      return JSON.parse(detail.data_snapshot_json) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

  return (
    <div data-testid={`run-detail-${runId}`}>
      {/* Summary card */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="bg-surface-inset rounded p-2">
          <span className="text-neutral-500 text-xs font-medium block mb-0.5">Run ID</span>
          <code className="font-mono text-xs text-neutral-800 break-all">{detail.id}</code>
        </div>
        <div className="bg-surface-inset rounded p-2">
          <span className="text-neutral-500 text-xs font-medium block mb-0.5">Modül</span>
          <span className="text-xs text-neutral-800">{detail.module_scope}</span>
        </div>
        <div className="bg-surface-inset rounded p-2">
          <span className="text-neutral-500 text-xs font-medium block mb-0.5">Provider</span>
          <span className="text-xs text-neutral-800">{detail.provider_name}</span>
        </div>
        <div className="bg-surface-inset rounded p-2">
          <span className="text-neutral-500 text-xs font-medium block mb-0.5">Blok</span>
          <span className="text-xs text-neutral-800">
            {detail.block_count_included} dahil / {detail.block_count_skipped} atlandı
          </span>
        </div>
        <div className="bg-surface-inset rounded p-2">
          <span className="text-neutral-500 text-xs font-medium block mb-0.5">Prompt Uzunluğu</span>
          <span className="text-xs text-neutral-800">{detail.final_prompt_text.length} karakter</span>
        </div>
        <div className="bg-surface-inset rounded p-2">
          <span className="text-neutral-500 text-xs font-medium block mb-0.5">Tarih</span>
          <span className="text-xs text-neutral-800">{new Date(detail.created_at).toLocaleString("tr-TR")}</span>
        </div>
      </div>

      {/* Error section */}
      {providerError && (
        <div className="mb-3 p-3 bg-error-light border border-error rounded-md" data-testid="run-provider-error">
          <p className="text-sm font-semibold text-error mb-1">Provider Hatası</p>
          <pre className="text-xs font-mono text-error whitespace-pre-wrap break-words m-0">
            {JSON.stringify(providerError, null, 2)}
          </pre>
        </div>
      )}

      {/* Final assembled prompt */}
      <Collapsible
        title="Birleştirilmiş Prompt"
        defaultOpen={true}
        copyText={detail.final_prompt_text}
      >
        <pre className="text-xs font-mono text-neutral-800 whitespace-pre-wrap break-words leading-relaxed m-0 max-h-[300px] overflow-y-auto">
          {detail.final_prompt_text}
        </pre>
      </Collapsible>

      {/* Block breakdown */}
      {detail.block_traces && detail.block_traces.length > 0 && (
        <Collapsible title="Blok Detayları" defaultOpen={true}>
          <BlockBreakdownView
            included={detail.block_traces.filter((t) => t.included)}
            skipped={detail.block_traces.filter((t) => !t.included)}
          />
        </Collapsible>
      )}

      {/* Provider request payload */}
      {finalPayload && (
        <Collapsible
          title="Provider Request Payload"
          copyText={JSON.stringify(finalPayload, null, 2)}
        >
          <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap break-words m-0 max-h-[200px] overflow-y-auto">
            {JSON.stringify(finalPayload, null, 2)}
          </pre>
        </Collapsible>
      )}

      {/* Provider response */}
      {providerResponse && (
        <Collapsible title="Provider Yanıtı">
          <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap break-words m-0 max-h-[200px] overflow-y-auto">
            {JSON.stringify(providerResponse, null, 2)}
          </pre>
        </Collapsible>
      )}

      {/* Snapshots */}
      {settingsSnapshot && (
        <Collapsible title="Settings Snapshot">
          <pre className="text-xs font-mono text-neutral-600 whitespace-pre-wrap break-words m-0 max-h-[150px] overflow-y-auto">
            {JSON.stringify(settingsSnapshot, null, 2)}
          </pre>
        </Collapsible>
      )}

      {dataSnapshot && (
        <Collapsible title="Data Snapshot">
          <pre className="text-xs font-mono text-neutral-600 whitespace-pre-wrap break-words m-0 max-h-[150px] overflow-y-auto">
            {JSON.stringify(dataSnapshot, null, 2)}
          </pre>
        </Collapsible>
      )}
    </div>
  );
}

// ── Main panel ──

interface JobPromptTracePanelProps {
  jobId: string;
}

export function JobPromptTracePanel({ jobId }: JobPromptTracePanelProps) {
  const { data: runs, isLoading, isError } = usePromptTracesForJob(jobId);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="text-neutral-500 text-sm" data-testid="prompt-trace-loading">
        Yükleniyor...
      </p>
    );
  }

  if (isError) {
    return (
      <p className="text-error text-sm" data-testid="prompt-trace-error">
        Trace verisi yüklenemedi.
      </p>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <p className="text-neutral-400 text-sm italic" data-testid="prompt-trace-empty">
        Bu job için prompt assembly trace kaydı bulunamadı.
      </p>
    );
  }

  const activeRunId = selectedRunId ?? runs[0].id;

  return (
    <div data-testid="job-prompt-trace-panel">
      {/* Run selector tabs */}
      {runs.length > 1 && (
        <div className="flex gap-1 flex-wrap mb-3 border-b border-border-subtle pb-2">
          {runs.map((run, i) => (
            <button
              key={run.id}
              onClick={() => setSelectedRunId(run.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md font-medium transition-colors",
                activeRunId === run.id
                  ? "bg-brand-600 text-white"
                  : "bg-surface-inset text-neutral-600 hover:bg-neutral-200"
              )}
              data-testid={`prompt-run-tab-${i}`}
            >
              {run.step_key ?? "run"} #{i + 1}
              {run.is_dry_run && (
                <span className="ml-1 text-xs opacity-75">(dry)</span>
              )}
            </button>
          ))}
        </div>
      )}

      <RunDetailView runId={activeRunId} />
    </div>
  );
}
