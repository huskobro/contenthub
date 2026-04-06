/**
 * ThemeRegistryPage — Wave 1 Final
 *
 * Admin page for managing themes:
 * - List all available themes (built-in + custom)
 * - See which theme is active
 * - Switch active theme
 * - Import new theme from JSON (AI-generated or hand-crafted)
 * - Validate imported themes
 * - Preview theme tokens
 * - Export theme as JSON
 * - Remove custom themes
 */

import { useState, useCallback, useRef } from "react";
import { cn } from "../../lib/cn";
import {
  PageShell,
  SectionShell,
  ActionButton,
  StatusBadge,
} from "../../components/design-system/primitives";
import { useThemeStore } from "../../stores/themeStore";
import { useToast } from "../../hooks/useToast";
import type { ThemeManifest, ThemeValidationError } from "../../components/design-system/themeContract";
import { applyThemeToDOM } from "../../components/design-system/themeEngine";

// ---------------------------------------------------------------------------
// Theme Preview Panel
// ---------------------------------------------------------------------------

function ThemePreviewPanel({ theme }: { theme: ThemeManifest }) {
  const t = theme;
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${t.colors.border.default}`,
        background: t.colors.surface.page,
      }}
      data-testid="theme-preview-panel"
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-2 py-3 px-4"
        style={{ background: t.colors.surface.sidebar }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-white"
          style={{
            background: t.colors.brand[600],
            fontSize: t.typography.size.xs,
            fontWeight: t.typography.weight.bold,
            fontFamily: t.typography.body.stack,
          }}
        >
          CH
        </div>
        <span
          style={{
            color: t.colors.neutral[0],
            fontSize: t.typography.size.sm,
            fontWeight: t.typography.weight.semibold,
            fontFamily: t.typography.body.stack,
          }}
        >
          Preview
        </span>
      </div>

      {/* Content area */}
      <div className="p-4">
        {/* Text samples */}
        <h4
          className="m-0 mb-2"
          style={{
            fontSize: t.typography.size.lg,
            fontWeight: t.typography.weight.semibold,
            color: t.colors.neutral[900],
            fontFamily: t.typography.heading.stack,
          }}
        >
          Baslik Ornegi
        </h4>
        <p
          className="m-0 mb-3"
          style={{
            fontSize: t.typography.size.base,
            color: t.colors.neutral[600],
            fontFamily: t.typography.body.stack,
            lineHeight: t.typography.lineHeight.normal,
          }}
        >
          Bu bir onizleme metnidir. Temanin tipografi ve renk tonlarini gosterir.
        </p>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap mb-3">
          {[
            { label: "Basarili", bg: t.colors.success.light, fg: t.colors.success.text },
            { label: "Uyari", bg: t.colors.warning.light, fg: t.colors.warning.text },
            { label: "Hata", bg: t.colors.error.light, fg: t.colors.error.text },
            { label: "Bilgi", bg: t.colors.info.light, fg: t.colors.info.text },
          ].map((b) => (
            <span
              key={b.label}
              className="inline-block py-1 px-2"
              style={{
                borderRadius: t.radius.full,
                fontSize: t.typography.size.xs,
                fontWeight: t.typography.weight.semibold,
                background: b.bg,
                color: b.fg,
                fontFamily: t.typography.body.stack,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>

        {/* Button samples */}
        <div className="flex gap-2 mb-3">
          <span
            className="inline-block py-2 px-4 text-white"
            style={{
              borderRadius: t.radius.md,
              background: t.colors.brand[600],
              fontSize: t.typography.size.base,
              fontWeight: t.typography.weight.medium,
              fontFamily: t.typography.body.stack,
            }}
          >
            Birincil
          </span>
          <span
            className="inline-block py-2 px-4"
            style={{
              borderRadius: t.radius.md,
              background: t.colors.surface.card,
              color: t.colors.neutral[700],
              fontSize: t.typography.size.base,
              fontWeight: t.typography.weight.medium,
              border: `1px solid ${t.colors.border.default}`,
              fontFamily: t.typography.body.stack,
            }}
          >
            Ikincil
          </span>
        </div>

        {/* Table sample */}
        <div
          className="overflow-hidden"
          style={{
            border: `1px solid ${t.colors.border.subtle}`,
            borderRadius: t.radius.md,
          }}
        >
          <table className="w-full border-collapse" style={{ fontFamily: t.typography.body.stack }}>
            <thead>
              <tr style={{ background: t.colors.neutral[100] }}>
                <th className="py-2 px-3 text-left" style={{ fontSize: t.typography.size.xs, fontWeight: t.typography.weight.semibold, color: t.colors.neutral[600] }}>Kolon</th>
                <th className="py-2 px-3 text-left" style={{ fontSize: t.typography.size.xs, fontWeight: t.typography.weight.semibold, color: t.colors.neutral[600] }}>Deger</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3" style={{ fontSize: t.typography.size.sm, color: t.colors.neutral[900], borderTop: `1px solid ${t.colors.border.subtle}` }}>Ornek satir</td>
                <td className="py-2 px-3" style={{ fontSize: t.typography.size.sm, color: t.colors.neutral[600], borderTop: `1px solid ${t.colors.border.subtle}`, fontFamily: t.typography.mono.stack }}>42</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mono sample */}
        <div
          className="mt-3 p-3"
          style={{
            background: t.colors.neutral[50],
            borderRadius: t.radius.md,
            fontFamily: t.typography.mono.stack,
            fontSize: t.typography.size.sm,
            color: t.colors.neutral[700],
          }}
        >
          <code>font: {t.typography.body.family} | mono: {t.typography.mono.family}</code>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theme Card
// ---------------------------------------------------------------------------

function ThemeCard({
  theme,
  isActive,
  isBuiltin,
  onActivate,
  onRemove,
  onExport,
  onPreview,
}: {
  theme: ThemeManifest;
  isActive: boolean;
  isBuiltin: boolean;
  onActivate: () => void;
  onRemove: () => void;
  onExport: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-5 transition-all duration-150",
        isActive
          ? "border border-brand-400 bg-brand-50 shadow-sm"
          : "border border-border bg-surface-card shadow-xs"
      )}
      data-testid={`theme-card-${theme.id}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-md font-semibold text-neutral-900">
              {theme.name}
            </h3>
            {isActive && <StatusBadge status="active" label="Aktif" />}
            {isBuiltin && (
              <span className="text-xs text-neutral-500 italic">
                yerlesik
              </span>
            )}
          </div>
          <p className="mt-1 mb-0 text-sm text-neutral-600 leading-normal">
            {theme.description}
          </p>
        </div>

        {/* Color swatch */}
        <div className="flex gap-0.5 shrink-0">
          {[theme.colors.brand[500], theme.colors.neutral[700], theme.colors.success.base, theme.colors.warning.base, theme.colors.error.base].map(
            (c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-sm"
                style={{ background: c }}
              />
            )
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex gap-3 text-xs text-neutral-500 mb-3 flex-wrap">
        <span>v{theme.version}</span>
        <span>{theme.author}</span>
        <span>{theme.typography.body.family}</span>
        <span>{theme.tone.join(", ")}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!isActive && (
          <ActionButton variant="primary" size="sm" onClick={onActivate} data-testid={`theme-activate-${theme.id}`}>
            Aktif Et
          </ActionButton>
        )}
        <ActionButton variant="secondary" size="sm" onClick={onPreview} data-testid={`theme-preview-${theme.id}`}>
          Onizle
        </ActionButton>
        <ActionButton variant="secondary" size="sm" onClick={onExport} data-testid={`theme-export-${theme.id}`}>
          Disari Aktar
        </ActionButton>
        {!isBuiltin && (
          <ActionButton variant="danger" size="sm" onClick={onRemove} data-testid={`theme-remove-${theme.id}`}>
            Kaldir
          </ActionButton>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Modal
// ---------------------------------------------------------------------------

function ThemeImportSection({
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

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function ThemeRegistryPage() {
  const toast = useToast();
  const themes = useThemeStore((s) => s.themes);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const setActiveTheme = useThemeStore((s) => s.setActiveTheme);
  const importTheme = useThemeStore((s) => s.importTheme);
  const removeTheme = useThemeStore((s) => s.removeTheme);
  const exportTheme = useThemeStore((s) => s.exportTheme);
  const isBuiltin = useThemeStore((s) => s.isBuiltin);
  const activeThemeFn = useThemeStore((s) => s.activeTheme);

  const [previewTheme, setPreviewTheme] = useState<ThemeManifest | null>(null);

  const handleActivate = useCallback(
    (id: string) => {
      setActiveTheme(id);
      // Apply to DOM immediately
      const theme = themes.find((t) => t.id === id);
      if (theme) {
        applyThemeToDOM(theme);
        toast.success(`"${theme.name}" temasi aktif edildi.`);
      }
    },
    [setActiveTheme, themes, toast]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const theme = themes.find((t) => t.id === id);
      const removed = removeTheme(id);
      if (removed) {
        toast.success(`"${theme?.name}" temasi kaldirildi.`);
        // If we removed the active theme, re-apply default
        if (id === activeThemeId) {
          applyThemeToDOM(activeThemeFn());
        }
      }
    },
    [removeTheme, themes, toast, activeThemeId, activeThemeFn]
  );

  const handleExport = useCallback(
    (id: string) => {
      const json = exportTheme(id);
      if (json) {
        navigator.clipboard.writeText(json).then(
          () => toast.success("Tema JSON'i panoya kopyalandi."),
          () => toast.error("Kopyalama basarisiz oldu.")
        );
      }
    },
    [exportTheme, toast]
  );

  const handleImport = useCallback(
    (jsonStr: string): ThemeValidationError[] => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        return [{ path: "", message: "Gecersiz JSON." }];
      }
      const errors = importTheme(parsed);
      if (errors.length === 0) {
        toast.success("Tema basariyla import edildi.");
      }
      return errors;
    },
    [importTheme, toast]
  );

  return (
    <PageShell
      title="Tema Yonetimi"
      subtitle="Aktif temayi degistirin, yeni tema import edin."
      testId="theme-registry"
    >
      {/* Active theme info */}
      <SectionShell
        title="Aktif Tema"
        testId="theme-active-section"
      >
        {(() => {
          const active = themes.find((t) => t.id === activeThemeId);
          if (!active) return <p className="text-neutral-500">Aktif tema bulunamadi.</p>;
          return (
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[active.colors.brand[500], active.colors.neutral[700], active.colors.success.base].map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-sm" style={{ background: c }} />
                ))}
              </div>
              <div>
                <span className="text-md font-semibold text-neutral-900">
                  {active.name}
                </span>
                <span className="ml-2 text-sm text-neutral-500">
                  v{active.version} — {active.typography.body.family}
                </span>
              </div>
            </div>
          );
        })()}
      </SectionShell>

      {/* Theme list */}
      <SectionShell
        title="Kayitli Temalar"
        description={`${themes.length} tema mevcut`}
        testId="theme-list-section"
      >
        <div className="grid gap-4">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={theme.id === activeThemeId}
              isBuiltin={isBuiltin(theme.id)}
              onActivate={() => handleActivate(theme.id)}
              onRemove={() => handleRemove(theme.id)}
              onExport={() => handleExport(theme.id)}
              onPreview={() => setPreviewTheme(theme)}
            />
          ))}
        </div>
      </SectionShell>

      {/* Preview */}
      {previewTheme && (
        <SectionShell
          title={`Onizleme: ${previewTheme.name}`}
          testId="theme-preview-section"
          actions={
            <ActionButton variant="secondary" size="sm" onClick={() => setPreviewTheme(null)}>
              Kapat
            </ActionButton>
          }
        >
          <ThemePreviewPanel theme={previewTheme} />
        </SectionShell>
      )}

      {/* Import */}
      <ThemeImportSection onImport={handleImport} />

      {/* Authoring guide hint */}
      <div
        className="mt-4 p-4 bg-info-light rounded-lg text-sm text-info-text leading-relaxed"
        data-testid="theme-authoring-hint"
      >
        <strong>AI ile Tema Uretme:</strong> Bir AI'ye "ContentHub ThemeManifest JSON uretten" deyip
        sonucu yukaridaki alana yapistirabilirsiniz. Tema otomatik dogrulanir ve sisteme eklenir.
        Gecerli bir tema ornegi icin mevcut bir temayi "Disari Aktar" ile kopyalayip referans alabilirsiniz.
      </div>
    </PageShell>
  );
}
