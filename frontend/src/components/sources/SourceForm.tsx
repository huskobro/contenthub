import { useState } from "react";
import type { SourceResponse, SourceCreatePayload } from "../../api/sourcesApi";

const SOURCE_TYPES = ["rss", "manual_url", "api"];
const TRUST_LEVELS = ["", "low", "medium", "high"];
const SCAN_MODES = ["", "manual", "auto", "curated"];
const STATUSES = ["active", "paused", "archived"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.375rem 0.5rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  fontSize: "0.875rem",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#64748b",
  marginBottom: "0.25rem",
};

const fieldStyle: React.CSSProperties = { marginBottom: "0.75rem" };

const errorStyle: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "0.8rem",
  marginTop: "0.25rem",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

interface SourceFormProps {
  initial?: Partial<SourceResponse>;
  onSubmit: (payload: SourceCreatePayload) => void;
  onCancel: () => void;
  isPending: boolean;
  submitError: string | null;
  submitLabel?: string;
  cancelLabel?: string;
}

export function SourceForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  submitError,
  submitLabel = "Kaydet",
  cancelLabel = "İptal",
}: SourceFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sourceType, setSourceType] = useState(initial?.source_type ?? "rss");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? "");
  const [feedUrl, setFeedUrl] = useState(initial?.feed_url ?? "");
  const [apiEndpoint, setApiEndpoint] = useState(initial?.api_endpoint ?? "");
  const [trustLevel, setTrustLevel] = useState(initial?.trust_level ?? "");
  const [scanMode, setScanMode] = useState(initial?.scan_mode ?? "");
  const [language, setLanguage] = useState(initial?.language ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Name zorunludur ve boş olamaz.");
      return;
    }
    if (!sourceType.trim()) {
      setValidationError("Source type zorunludur.");
      return;
    }
    if (sourceType === "rss" && !feedUrl.trim()) {
      setValidationError("RSS source için feed_url zorunludur.");
      return;
    }
    if (sourceType === "manual_url" && !baseUrl.trim()) {
      setValidationError("manual_url source için base_url zorunludur.");
      return;
    }
    if (sourceType === "api" && !apiEndpoint.trim()) {
      setValidationError("API source için api_endpoint zorunludur.");
      return;
    }

    const payload: SourceCreatePayload = {
      name: name.trim(),
      source_type: sourceType,
      status,
    };
    if (baseUrl.trim()) payload.base_url = baseUrl.trim();
    if (feedUrl.trim()) payload.feed_url = feedUrl.trim();
    if (apiEndpoint.trim()) payload.api_endpoint = apiEndpoint.trim();
    if (trustLevel) payload.trust_level = trustLevel;
    if (scanMode) payload.scan_mode = scanMode;
    if (language.trim()) payload.language = language.trim();
    if (category.trim()) payload.category = category.trim();
    if (notes.trim()) payload.notes = notes.trim();

    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Source adı" />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Source Type *</label>
        <select style={inputStyle} value={sourceType} onChange={e => setSourceType(e.target.value)}>
          {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Status *</label>
        <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {sourceType === "rss" && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Feed URL *</label>
          <input style={inputStyle} value={feedUrl} onChange={e => setFeedUrl(e.target.value)} placeholder="https://example.com/feed.xml" />
        </div>
      )}

      {sourceType === "manual_url" && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Base URL *</label>
          <input style={inputStyle} value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://example.com" />
        </div>
      )}

      {sourceType === "api" && (
        <div style={fieldStyle}>
          <label style={labelStyle}>API Endpoint *</label>
          <input style={inputStyle} value={apiEndpoint} onChange={e => setApiEndpoint(e.target.value)} placeholder="https://api.example.com/news" />
        </div>
      )}

      <div style={fieldStyle}>
        <label style={labelStyle}>Trust Level</label>
        <select style={inputStyle} value={trustLevel} onChange={e => setTrustLevel(e.target.value)}>
          {TRUST_LEVELS.map(t => <option key={t} value={t}>{t || "—"}</option>)}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Scan Mode</label>
        <select style={inputStyle} value={scanMode} onChange={e => setScanMode(e.target.value)}>
          {SCAN_MODES.map(m => <option key={m} value={m}>{m || "—"}</option>)}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Language</label>
        <input style={inputStyle} value={language} onChange={e => setLanguage(e.target.value)} placeholder="tr, en ..." />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Category</label>
        <input style={inputStyle} value={category} onChange={e => setCategory(e.target.value)} placeholder="general, tech ..." />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: "60px" }} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {validationError && <p style={errorStyle}>{validationError}</p>}
      {submitError && <p style={errorStyle}>{submitError}</p>}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "0.375rem 1rem",
            background: isPending ? "#94a3b8" : "#1e40af",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: isPending ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
          }}
        >
          {isPending ? "Kaydediliyor..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "0.375rem 1rem",
            background: "transparent",
            color: "#64748b",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
