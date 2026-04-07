/**
 * PromptPreviewSection — inline preview with controls.
 * Allows testing the prompt assembly engine with configurable inputs.
 */

import { useState, type ReactNode } from "react";
import { usePromptAssemblyPreview } from "../../hooks/usePromptAssemblyPreview";
import { BlockBreakdownView } from "./BlockBreakdownView";
import { ActionButton } from "../design-system/primitives";
import { cn } from "../../lib/cn";

// ── Collapsible helper ──

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  actions,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-inset hover:bg-neutral-100 transition-colors text-left"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-neutral-800">{title}</span>
        <div className="flex items-center gap-2">
          {actions}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={cn("transition-transform duration-fast text-neutral-500", open ? "rotate-180" : "")}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className="text-xs text-brand-600 hover:text-brand-800 font-medium px-1.5 py-0.5 rounded transition-colors"
      title="Kopyala"
    >
      {copied ? "Kopyalandı!" : "Kopyala"}
    </button>
  );
}

// ── Main component ──

const MODULE_OPTIONS = [
  { value: "news_bulletin", label: "News Bulletin" },
  { value: "standard_video", label: "Standard Video" },
];

const STEP_OPTIONS: Record<string, { value: string; label: string }[]> = {
  news_bulletin: [
    { value: "script", label: "Script" },
    { value: "metadata", label: "Metadata" },
  ],
  standard_video: [
    { value: "script", label: "Script" },
    { value: "metadata", label: "Metadata" },
  ],
};

export function PromptPreviewSection() {
  const [moduleScope, setModuleScope] = useState("news_bulletin");
  const [stepKey, setStepKey] = useState("script");
  const [dataOverridesText, setDataOverridesText] = useState("");
  const [settingsOverridesText, setSettingsOverridesText] = useState("");
  const [dataJsonError, setDataJsonError] = useState<string | null>(null);
  const [settingsJsonError, setSettingsJsonError] = useState<string | null>(null);

  const previewMutation = usePromptAssemblyPreview();

  function parseJsonOptional(text: string, setError: (e: string | null) => void): Record<string, unknown> | undefined {
    if (!text.trim()) {
      setError(null);
      return undefined;
    }
    try {
      const parsed = JSON.parse(text);
      setError(null);
      return parsed as Record<string, unknown>;
    } catch {
      setError("Geçersiz JSON formatı");
      return undefined;
    }
  }

  function handlePreview() {
    const dataOverrides = parseJsonOptional(dataOverridesText, setDataJsonError);
    const settingsOverrides = parseJsonOptional(settingsOverridesText, setSettingsJsonError);
    if (dataJsonError || settingsJsonError) return;

    previewMutation.mutate({
      module_scope: moduleScope,
      step_key: stepKey || undefined,
      data_overrides: dataOverrides,
      settings_overrides: settingsOverrides,
    });
  }

  const result = previewMutation.data;

  return (
    <div data-testid="prompt-preview-section">
      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">
            Modül
          </label>
          <select
            value={moduleScope}
            onChange={(e) => {
              setModuleScope(e.target.value);
              setStepKey("script");
            }}
            className="w-full py-2 px-3 border border-border-subtle rounded-md text-sm bg-surface-card text-neutral-800 outline-none focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100"
            data-testid="preview-module-select"
          >
            {MODULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">
            Adım (Step)
          </label>
          <select
            value={stepKey}
            onChange={(e) => setStepKey(e.target.value)}
            className="w-full py-2 px-3 border border-border-subtle rounded-md text-sm bg-surface-card text-neutral-800 outline-none focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100"
            data-testid="preview-step-select"
          >
            {(STEP_OPTIONS[moduleScope] ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional overrides */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">
            Data Override (JSON)
          </label>
          <textarea
            value={dataOverridesText}
            onChange={(e) => setDataOverridesText(e.target.value)}
            rows={3}
            placeholder='{"title": "Test başlığı"}'
            className={cn(
              "w-full py-2 px-3 border rounded-md text-xs font-mono bg-surface-card text-neutral-800 outline-none resize-y focus:ring-[3px] focus:ring-brand-100",
              dataJsonError ? "border-error focus:border-error" : "border-border-subtle focus:border-brand-400"
            )}
            data-testid="preview-data-overrides"
          />
          {dataJsonError && (
            <p className="text-xs text-error mt-1">{dataJsonError}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">
            Settings Override (JSON)
          </label>
          <textarea
            value={settingsOverridesText}
            onChange={(e) => setSettingsOverridesText(e.target.value)}
            rows={3}
            placeholder='{"news_bulletin.config.max_items": 5}'
            className={cn(
              "w-full py-2 px-3 border rounded-md text-xs font-mono bg-surface-card text-neutral-800 outline-none resize-y focus:ring-[3px] focus:ring-brand-100",
              settingsJsonError ? "border-error focus:border-error" : "border-border-subtle focus:border-brand-400"
            )}
            data-testid="preview-settings-overrides"
          />
          {settingsJsonError && (
            <p className="text-xs text-error mt-1">{settingsJsonError}</p>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="flex items-center gap-3 mb-5">
        <ActionButton
          variant="primary"
          size="sm"
          onClick={handlePreview}
          disabled={previewMutation.isPending}
          loading={previewMutation.isPending}
          data-testid="preview-run-button"
        >
          Preview Oluştur
        </ActionButton>

        {previewMutation.isError && (
          <span className="text-xs text-error">
            Hata: {previewMutation.error instanceof Error ? previewMutation.error.message : "Bilinmeyen hata"}
          </span>
        )}

        {previewMutation.isSuccess && result && (
          <span className="text-xs text-success-text">
            {result.included_blocks.length} blok dahil edildi
          </span>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3" data-testid="preview-results">
          {/* Assembled prompt */}
          <CollapsibleSection
            title="Birleştirilmiş Prompt"
            defaultOpen={true}
            actions={<CopyButton text={result.final_prompt_text} />}
          >
            <pre className="text-xs font-mono text-neutral-800 whitespace-pre-wrap break-words leading-relaxed m-0 max-h-[300px] overflow-y-auto">
              {result.final_prompt_text}
            </pre>
          </CollapsibleSection>

          {/* Block breakdown */}
          <CollapsibleSection title="Blok Detayları" defaultOpen={true}>
            <BlockBreakdownView
              included={result.included_blocks}
              skipped={result.skipped_blocks}
            />
          </CollapsibleSection>

          {/* Provider payload */}
          <CollapsibleSection
            title="Provider Payload"
            actions={<CopyButton text={JSON.stringify(result.final_payload, null, 2)} />}
          >
            <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap break-words m-0 max-h-[200px] overflow-y-auto">
              {JSON.stringify(result.final_payload, null, 2)}
            </pre>
          </CollapsibleSection>

          {/* Data snapshot summary */}
          <CollapsibleSection title="Data Özeti">
            <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap break-words m-0 max-h-[150px] overflow-y-auto">
              {JSON.stringify(result.data_snapshot_summary, null, 2)}
            </pre>
          </CollapsibleSection>

          {/* Settings snapshot summary */}
          <CollapsibleSection title="Settings Özeti">
            <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap break-words m-0 max-h-[150px] overflow-y-auto">
              {JSON.stringify(result.settings_snapshot_summary, null, 2)}
            </pre>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
