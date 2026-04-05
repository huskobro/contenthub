import type { JobStepResponse } from "../../api/jobsApi";

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
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        background: "#fafbfc",
        padding: "1rem",
        marginBottom: "1rem",
      }}
    >
      <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9375rem", color: "#0f172a" }}>{title}</h4>
      {children}
    </div>
  );
}

const LABEL: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 500,
  fontSize: "0.75rem",
};

const VALUE: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#1e293b",
};

const SUCCESS_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "0.1rem 0.375rem",
  borderRadius: "4px",
  fontSize: "0.6875rem",
  fontWeight: 600,
  background: "#dcfce7",
  color: "#166534",
};

const FAIL_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "0.1rem 0.375rem",
  borderRadius: "4px",
  fontSize: "0.6875rem",
  fontWeight: 600,
  background: "#fee2e2",
  color: "#991b1b",
};

function parseTrace(json: string | null): ProviderTrace | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    // The provider_trace may be nested under "provider_trace" key or at top level
    if (parsed.provider_trace && typeof parsed.provider_trace === "object") {
      return parsed.provider_trace as ProviderTrace;
    }
    // If it has provider_name at top level, it's the trace itself
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
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        padding: "0.75rem",
        marginBottom: "0.5rem",
        background: "#fff",
      }}
      data-testid={`provider-trace-${step.step_key}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <strong style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{step.step_key}</strong>
        <span style={trace.success ? SUCCESS_BADGE : FAIL_BADGE}>
          {trace.success ? "OK" : "FAIL"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.25rem 0.75rem", fontSize: "0.8125rem" }}>
        {trace.provider_name && (
          <>
            <span style={LABEL}>Provider:</span>
            <span style={VALUE}>{trace.provider_name}</span>
          </>
        )}
        {trace.provider_kind && (
          <>
            <span style={LABEL}>Tur:</span>
            <span style={VALUE}>{trace.provider_kind}</span>
          </>
        )}
        {trace.model && (
          <>
            <span style={LABEL}>Model:</span>
            <span style={VALUE}>{trace.model}</span>
          </>
        )}
        {trace.latency_ms != null && (
          <>
            <span style={LABEL}>Gecikme:</span>
            <span style={VALUE}>{(trace.latency_ms / 1000).toFixed(2)}s</span>
          </>
        )}
        {(trace.input_tokens != null || trace.output_tokens != null) && (
          <>
            <span style={LABEL}>Token:</span>
            <span style={VALUE}>
              {trace.input_tokens ?? "—"} in / {trace.output_tokens ?? "—"} out
            </span>
          </>
        )}
        {trace.cost_usd_estimate != null && (
          <>
            <span style={LABEL}>Tahmini Maliyet:</span>
            <span style={VALUE}>${trace.cost_usd_estimate.toFixed(4)}</span>
          </>
        )}
        {trace.error_type && (
          <>
            <span style={LABEL}>Hata Tipi:</span>
            <span style={{ ...VALUE, color: "#dc2626" }}>{trace.error_type}</span>
          </>
        )}
        {trace.error_message && (
          <>
            <span style={LABEL}>Hata:</span>
            <span style={{ ...VALUE, color: "#dc2626", wordBreak: "break-word" }}>{trace.error_message}</span>
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
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.75rem" }}>
            Henuz log kaydi yok.
          </p>
        ) : (
          logSteps.map((s) => (
            <div key={s.id} style={{ marginBottom: "0.5rem" }}>
              <strong style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{s.step_key}</strong>
              <pre
                style={{
                  background: "#1e293b",
                  color: "#e2e8f0",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  overflow: "auto",
                  maxHeight: "200px",
                  marginTop: "0.25rem",
                }}
              >
                {s.log_text}
              </pre>
            </div>
          ))
        )}
      </SystemCard>

      <SystemCard title="Artifacts">
        {artifactSteps.length === 0 ? (
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.75rem" }}>
            Henuz artifact yok.
          </p>
        ) : (
          artifactSteps.map((s) => {
            let parsed: unknown = null;
            try { parsed = JSON.parse(s.artifact_refs_json!); } catch { /* ignore */ }
            return (
              <div key={s.id} style={{ marginBottom: "0.5rem" }}>
                <strong style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{s.step_key}</strong>
                <pre
                  style={{
                    background: "#1e293b",
                    color: "#e2e8f0",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    overflow: "auto",
                    maxHeight: "200px",
                    marginTop: "0.25rem",
                  }}
                >
                  {parsed ? JSON.stringify(parsed, null, 2) : s.artifact_refs_json}
                </pre>
              </div>
            );
          })
        )}
      </SystemCard>

      <SystemCard title="Provider Trace">
        {tracePairs.length === 0 ? (
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.75rem" }} data-testid="provider-trace-empty">
            Henuz provider trace verisi yok.
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
