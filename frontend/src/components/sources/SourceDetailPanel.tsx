import { useSourceDetail } from "../../hooks/useSourceDetail";

interface SourceDetailPanelProps {
  sourceId: string | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>{label}: </span>
      <span style={{ fontSize: "0.875rem", color: value ? "#1e293b" : "#94a3b8" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function UrlField({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>{label}: </span>
      {value ? (
        <span style={{
          fontSize: "0.8rem", color: "#1e40af",
          wordBreak: "break-all", fontFamily: "monospace",
        }}>
          {value}
        </span>
      ) : (
        <span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>—</span>
      )}
    </div>
  );
}

export function SourceDetailPanel({ sourceId }: SourceDetailPanelProps) {
  const { data: source, isLoading, isError, error } = useSourceDetail(sourceId);

  if (!sourceId) {
    return (
      <div style={{
        padding: "2rem", color: "#94a3b8", fontSize: "0.875rem",
        textAlign: "center", border: "1px dashed #e2e8f0", borderRadius: "6px",
      }}>
        Bir source seçin.
      </div>
    );
  }

  if (isLoading) return <p style={{ color: "#64748b", padding: "1rem" }}>Yükleniyor...</p>;

  if (isError) {
    return (
      <p style={{ color: "#dc2626", padding: "1rem" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }

  if (!source) return null;

  return (
    <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" }}>
      <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#1e293b" }}>{source.name}</h3>

      <Field label="Source Type" value={source.source_type} />
      <Field label="Status" value={source.status} />
      <Field label="Trust Level" value={source.trust_level} />
      <Field label="Scan Mode" value={source.scan_mode} />
      <Field label="Language" value={source.language} />
      <Field label="Category" value={source.category} />

      <div style={{ marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
        <UrlField label="Base URL" value={source.base_url} />
        <UrlField label="Feed URL" value={source.feed_url} />
        <UrlField label="API Endpoint" value={source.api_endpoint} />
      </div>

      {source.notes && (
        <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
          <Field label="Notes" value={source.notes} />
        </div>
      )}

      <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
        <Field label="Created" value={new Date(source.created_at).toLocaleString()} />
        <Field label="Updated" value={new Date(source.updated_at).toLocaleString()} />
      </div>
    </div>
  );
}
