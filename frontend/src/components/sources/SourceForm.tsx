import { useState } from "react";
import type { SourceResponse, SourceCreatePayload } from "../../api/sourcesApi";
import { cn } from "../../lib/cn";

const SOURCE_TYPES = ["rss", "manual_url", "api"];
const TRUST_LEVELS = ["", "low", "medium", "high"];
const SCAN_MODES = ["", "manual", "auto", "curated"];
const STATUSES = ["active", "paused", "archived"];

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

  const inputCls = "w-full px-2 py-1.5 border border-border rounded-sm text-md box-border focus:outline-none focus:ring-2 focus:ring-focus";

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
      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-600 mb-1">Name *</label>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Source adı" />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-600 mb-1">Source Type *</label>
        <select className={inputCls} value={sourceType} onChange={e => setSourceType(e.target.value)}>
          {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-600 mb-1">Status *</label>
        <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {sourceType === "rss" && (
        <div className="mb-3">
          <label className="block text-sm font-semibold text-neutral-600 mb-1">Feed URL *</label>
          <input className={inputCls} value={feedUrl} onChange={e => setFeedUrl(e.target.value)} placeholder="https://example.com/feed.xml" />
        </div>
      )}

      {sourceType === "manual_url" && (
        <div className="mb-3">
          <label className="block text-sm font-semibold text-neutral-600 mb-1">Base URL *</label>
          <input className={inputCls} value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://example.com" />
        </div>
      )}

      {sourceType === "api" && (
        <div className="mb-3">
          <label className="block text-sm font-semibold text-neutral-600 mb-1">API Endpoint *</label>
          <input className={inputCls} value={apiEndpoint} onChange={e => setApiEndpoint(e.target.value)} placeholder="https://api.example.com/news" />
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-600 mb-1">Trust Level</label>
        <select className={inputCls} value={trustLevel} onChange={e => setTrustLevel(e.target.value)}>
          {TRUST_LEVELS.map(t => <option key={t} value={t}>{t || "—"}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-600 mb-1">Scan Mode</label>
        <select className={inputCls} value={scanMode} onChange={e => setScanMode(e.target.value)}>
          {SCAN_MODES.map(m => <option key={m} value={m}>{m || "—"}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-600 mb-1">Language</label>
        <input className={inputCls} value={language} onChange={e => setLanguage(e.target.value)} placeholder="tr, en ..." />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-600 mb-1">Category</label>
        <input className={inputCls} value={category} onChange={e => setCategory(e.target.value)} placeholder="general, tech ..." />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-600 mb-1">Notes</label>
        <textarea className={cn(inputCls, "resize-y min-h-[60px]")} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {validationError && <p className="text-error text-base mt-1 break-words [overflow-wrap:anywhere]">{validationError}</p>}
      {submitError && <p className="text-error text-base mt-1 break-words [overflow-wrap:anywhere]">{submitError}</p>}

      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "px-4 py-1.5 text-neutral-0 border-none rounded-sm text-md",
            isPending ? "bg-neutral-500 cursor-not-allowed" : "bg-brand-700 cursor-pointer hover:bg-brand-800 transition-colors duration-fast"
          )}
        >
          {isPending ? "Kaydediliyor..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-transparent text-neutral-600 border border-border rounded-sm cursor-pointer text-md hover:bg-neutral-50 transition-colors duration-fast"
        >
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
