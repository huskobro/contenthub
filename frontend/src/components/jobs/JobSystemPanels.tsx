import type { JobStepResponse } from "../../api/jobsApi";
import { cn } from "../../lib/cn";

interface ProviderTrace {
  provider_name?: string;
  provider_kind?: string;
  step_key?: string;
  model?: string;
  success?: boolean;
  latency_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd_estimate?: number;
  error_type?: string;
  error_message?: string;
  created_at?: string;
  [key: string]: unknown;
}

function SystemCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border-subtle rounded-md bg-neutral-50 p-4 mb-4">
      <h4 className="m-0 mb-2 text-lg text-neutral-900">{title}</h4>
      {children}
    </div>
  );
}

function parseTrace(json: string | null): ProviderTrace | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed.provider_trace && typeof parsed.provider_trace === "object") {
      return parsed.provider_trace as ProviderTrace;
    }
    if (parsed.provider_name) {
      return parsed as ProviderTrace;
    }
    return null;
  } catch {
    return null;
  }
}

function ProviderTraceCard({ step, trace }: { step: JobStepResponse; trace: ProviderTrace }) {
  return (
    <div
      className="border border-border-subtle rounded-md p-3 mb-2 bg-neutral-0"
      data-testid={`provider-trace-${step.step_key}`}
    >
      <div className="flex justify-between mb-2">
        <strong className="font-mono text-base">{step.step_key}</strong>
        <span className={cn(
          "inline-block px-1.5 py-0.5 rounded-sm text-xs font-semibold",
          trace.success ? "bg-success-light text-success-text" : "bg-error-light text-error-text"
        )}>
          {trace.success ? "OK" : "FAIL"}
        </span>
      </div>
      <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-base">
        {trace.provider_name && (
          <>
            <span className="text-neutral-600 font-medium text-sm">Provider:</span>
            <span className="text-base text-neutral-900">{trace.provider_name}</span>
          </>
        )}
        {trace.provider_kind && (
          <>
            <span className="text-neutral-600 font-medium text-sm">Tur:</span>
            <span className="text-base text-neutral-900">{trace.provider_kind}</span>
          </>
        )}
        {trace.model && (
          <>
            <span className="text-neutral-600 font-medium text-sm">Model:</span>
            <span className="text-base text-neutral-900">{trace.model}</span>
          </>
        )}
        {trace.latency_ms != null && (
          <>
            <span className="text-neutral-600 font-medium text-sm">Gecikme:</span>
            <span className="text-base text-neutral-900">{(trace.latency_ms / 1000).toFixed(2)}s</span>
          </>
        )}
        {(trace.input_tokens != null || trace.output_tokens != null) && (
          <>
            <span className="text-neutral-600 font-medium text-sm">Token:</span>
            <span className="text-base text-neutral-900">
              {trace.input_tokens ?? "—"} in / {trace.output_tokens ?? "—"} out
            </span>
          </>
        )}
        {trace.cost_usd_estimate != null && (
          <>
            <span className="text-neutral-600 font-medium text-sm">Tahmini Maliyet:</span>
            <span className="text-base text-neutral-900">${trace.cost_usd_estimate.toFixed(4)}</span>
          </>
        )}
        {trace.error_type && (
          <>
            <span className="text-neutral-600 font-medium text-sm">Hata Tipi:</span>
            <span className="text-base text-error">{trace.error_type}</span>
          </>
        )}
        {trace.error_message && (
          <>
            <span className="text-neutral-600 font-medium text-sm">Hata:</span>
            <span className="text-base text-error break-words">{trace.error_message}</span>
          </>
        )}
      </div>
    </div>
  );
}

interface JobSystemPanelsProps {
  steps?: JobStepResponse[];
}

export function JobSystemPanels({ steps = [] }: JobSystemPanelsProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];

  // Extract provider traces from steps
  const tracePairs: { step: JobStepResponse; trace: ProviderTrace }[] = [];
  for (const step of safeSteps) {
    const trace = parseTrace(step.provider_trace_json);
    if (trace) {
      tracePairs.push({ step, trace });
    }
  }

  // Extract logs from steps
  const logSteps = safeSteps.filter((s) => s.log_text);

  // Extract artifacts from steps
  const artifactSteps = safeSteps.filter((s) => s.artifact_refs_json);

  return (
    <div>
      <SystemCard title="Logs">
        {logSteps.length === 0 ? (
          <p className="m-0 text-neutral-500 text-sm">
            Henüz log kaydi yok.
          </p>
        ) : (
          logSteps.map((s) => (
            <div key={s.id} className="mb-2">
              <strong className="font-mono text-base">{s.step_key}</strong>
              <pre className="bg-neutral-900 text-border-subtle p-2 rounded-sm text-sm overflow-auto max-h-[200px] mt-1">
                {s.log_text}
              </pre>
            </div>
          ))
        )}
      </SystemCard>

      <SystemCard title="Artifacts">
        {artifactSteps.length === 0 ? (
          <p className="m-0 text-neutral-500 text-sm">
            Henüz artifact yok.
          </p>
        ) : (
          artifactSteps.map((s) => {
            let parsed: unknown = null;
            try { parsed = JSON.parse(s.artifact_refs_json!); } catch { /* ignore */ }
            return (
              <div key={s.id} className="mb-2">
                <strong className="font-mono text-base">{s.step_key}</strong>
                <pre className="bg-neutral-900 text-border-subtle p-2 rounded-sm text-sm overflow-auto max-h-[200px] mt-1">
                  {parsed ? JSON.stringify(parsed, null, 2) : s.artifact_refs_json}
                </pre>
              </div>
            );
          })
        )}
      </SystemCard>

      <SystemCard title="Provider Trace">
        {tracePairs.length === 0 ? (
          <p className="m-0 text-neutral-500 text-sm" data-testid="provider-trace-empty">
            Henüz provider trace verisi yok.
          </p>
        ) : (
          tracePairs.map(({ step, trace }) => (
            <ProviderTraceCard key={step.id} step={step} trace={trace} />
          ))
        )}
      </SystemCard>
    </div>
  );
}
