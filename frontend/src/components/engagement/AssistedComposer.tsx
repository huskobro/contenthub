/**
 * AssistedComposer — Faz 7F.
 *
 * Reusable text composer with manual input + "AI ile oner" hook/slot.
 * Designed for: comment reply, playlist description, post caption, etc.
 *
 * Props:
 *   - value / onChange: controlled text state
 *   - onSubmit: called when user clicks send
 *   - placeholder: input placeholder
 *   - submitLabel: button label (default: "Gonder")
 *   - maxLength: optional char limit
 *   - disabled / loading: state control
 *   - onAiSuggest: optional callback — if provided, shows "AI ile Oner" button
 *   - aiSuggestion: text from AI (displayed as suggestion chip)
 *   - aiLoading: whether AI suggestion is loading
 *   - contextLabel: optional label above the composer (e.g. "Yorum Yaniti")
 *   - testId: for testing
 */

import { useState } from "react";

export interface AssistedComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel?: string;
  maxLength?: number;
  disabled?: boolean;
  loading?: boolean;
  onAiSuggest?: () => void;
  aiSuggestion?: string | null;
  aiLoading?: boolean;
  contextLabel?: string;
  testId?: string;
}

export function AssistedComposer({
  value,
  onChange,
  onSubmit,
  placeholder = "Yanit yazin...",
  submitLabel = "Gonder",
  maxLength,
  disabled = false,
  loading = false,
  onAiSuggest,
  aiSuggestion,
  aiLoading = false,
  contextLabel,
  testId = "assisted-composer",
}: AssistedComposerProps) {
  const [showSuggestion, setShowSuggestion] = useState(true);

  const charCount = value.length;
  const overLimit = maxLength ? charCount > maxLength : false;
  const canSubmit = value.trim().length > 0 && !overLimit && !disabled && !loading;

  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      onChange(aiSuggestion);
      setShowSuggestion(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      {/* Context label */}
      {contextLabel && (
        <p className="text-xs font-medium text-neutral-500 m-0" data-testid={`${testId}-context`}>
          {contextLabel}
        </p>
      )}

      {/* AI suggestion chip */}
      {aiSuggestion && showSuggestion && (
        <div
          className="p-2 bg-brand-50 border border-brand-200 rounded-md text-sm text-neutral-700"
          data-testid={`${testId}-ai-suggestion`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-brand-600">AI Onerisi</span>
            <div className="flex gap-1">
              <button
                type="button"
                className="text-xs text-brand-600 hover:text-brand-700 underline"
                onClick={handleApplySuggestion}
                data-testid={`${testId}-apply-suggestion`}
              >
                Kullan
              </button>
              <button
                type="button"
                className="text-xs text-neutral-400 hover:text-neutral-600"
                onClick={() => setShowSuggestion(false)}
              >
                Kapat
              </button>
            </div>
          </div>
          <p className="text-sm text-neutral-700 m-0 whitespace-pre-wrap">{aiSuggestion}</p>
        </div>
      )}

      {/* Textarea */}
      <textarea
        className="w-full min-h-[80px] p-2 border border-border-default rounded-md text-sm text-neutral-900 bg-surface-page resize-y focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        maxLength={maxLength ? maxLength + 50 : undefined} // soft limit — allow typing past, warn visually
        data-testid={`${testId}-textarea`}
      />

      {/* Footer: char count + actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {maxLength && (
            <span
              className={`text-xs ${overLimit ? "text-error-base font-medium" : "text-neutral-400"}`}
              data-testid={`${testId}-char-count`}
            >
              {charCount}/{maxLength}
            </span>
          )}
          <span className="text-xs text-neutral-400">Ctrl+Enter ile gonder</span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI suggest button — future hook */}
          {onAiSuggest && (
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-md bg-surface-card border border-brand-200 text-brand-600 hover:bg-brand-50 disabled:opacity-50"
              onClick={() => {
                setShowSuggestion(true);
                onAiSuggest();
              }}
              disabled={aiLoading || disabled}
              data-testid={`${testId}-ai-btn`}
            >
              {aiLoading ? "Dusunuyor..." : "AI ile Oner"}
            </button>
          )}

          {/* Submit */}
          <button
            type="button"
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onSubmit}
            disabled={!canSubmit}
            data-testid={`${testId}-submit`}
          >
            {loading ? "Gonderiliyor..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
