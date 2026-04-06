/**
 * ThemeImportForm — Extracted from ThemeRegistryPage.
 *
 * Provides a textarea for pasting ThemeManifest JSON, validates it,
 * and calls the parent onImport callback. Shows validation errors
 * and success feedback inline.
 */

import { useState, useCallback } from "react";
import { cn } from "../../lib/cn";
import {
  SectionShell,
  ActionButton,
} from "../design-system/primitives";
import type { ThemeValidationError } from "../design-system/themeContract";

export function ThemeImportForm({
  onImport,
}: {
  onImport: (json: string) => ThemeValidationError[];
}) {
  const [jsonInput, setJsonInput] = useState("");
  const [errors, setErrors] = useState<ThemeValidationError[]>([]);
  const [success, setSuccess] = useState(false);

  const handleImport = useCallback(() => {
    setErrors([]);
    setSuccess(false);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setErrors([{ path: "", message: "Gecersiz JSON formati." }]);
      return;
    }

    const result = onImport(JSON.stringify(parsed));
    if (result.length > 0) {
      setErrors(result);
    } else {
      setSuccess(true);
      setJsonInput("");
      setTimeout(() => setSuccess(false), 3000);
    }
  }, [jsonInput, onImport]);

  return (
    <SectionShell
      title="Tema Import"
      description="AI'den veya baska kaynaktan alinan ThemeManifest JSON'ini yapistirin ve sisteme ekleyin."
      testId="theme-import-section"
    >
      <textarea
        value={jsonInput}
        onChange={(e) => { setJsonInput(e.target.value); setErrors([]); setSuccess(false); }}
        placeholder='{"id": "my-theme", "name": "My Theme", ...}'
        className={cn(
          "w-full min-h-[200px] p-3 text-sm font-mono rounded-md bg-surface-card text-neutral-900 resize-y leading-normal",
          errors.length > 0 ? "border border-error" : "border border-border"
        )}
        data-testid="theme-import-textarea"
      />

      {errors.length > 0 && (
        <div
          className="mt-2 p-3 bg-error-light rounded-md text-sm text-error-text"
          data-testid="theme-import-errors"
        >
          <strong>Dogrulama Hatalari:</strong>
          <ul className="mt-1 mb-0 pl-4">
            {errors.map((err, i) => (
              <li key={i}>
                {err.path && <code className="font-mono">{err.path}</code>}
                {err.path && ": "}
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div
          className="mt-2 p-3 bg-success-light rounded-md text-sm text-success-text"
          data-testid="theme-import-success"
        >
          Tema basariyla import edildi!
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <ActionButton
          variant="primary"
          size="sm"
          onClick={handleImport}
          disabled={!jsonInput.trim()}
          data-testid="theme-import-btn"
        >
          Import Et
        </ActionButton>
        {jsonInput && (
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => { setJsonInput(""); setErrors([]); setSuccess(false); }}
          >
            Temizle
          </ActionButton>
        )}
      </div>
    </SectionShell>
  );
}
