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
 *
 * Sub-components extracted to frontend/src/components/themes/:
 * - ThemePreviewPanel — inline theme preview rendering
 * - ThemeImportForm — JSON import with validation
 * - ThemeExportButton — clipboard export
 */

import { useState, useCallback } from "react";
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
import { ThemePreviewPanel } from "../../components/themes/ThemePreviewPanel";
import { ThemeImportForm } from "../../components/themes/ThemeImportForm";
import { ThemeExportButton } from "../../components/themes/ThemeExportButton";
import { SurfacePickerSection } from "../../components/surfaces/SurfacePickerSection";

// ---------------------------------------------------------------------------
// Theme Card
// ---------------------------------------------------------------------------

function ThemeCard({
  theme,
  isActive,
  isBuiltin,
  onActivate,
  onRemove,
  onPreview,
}: {
  theme: ThemeManifest;
  isActive: boolean;
  isBuiltin: boolean;
  onActivate: () => void;
  onRemove: () => void;
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
        <ThemeExportButton themeId={theme.id} size="sm" />
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
// Main Page
// ---------------------------------------------------------------------------

export function ThemeRegistryPage() {
  const toast = useToast();
  const themes = useThemeStore((s) => s.themes);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const setActiveTheme = useThemeStore((s) => s.setActiveTheme);
  const importTheme = useThemeStore((s) => s.importTheme);
  const removeTheme = useThemeStore((s) => s.removeTheme);
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
      title="Görünüm ve Tema"
      subtitle="Arayüz yüzeyi (shell) ve renk teması ayrı kavramlardır. İkisini de buradan yönetebilirsiniz."
      testId="theme-registry"
    >
      {/* -------------------------------------------------------------- */}
      {/* Concept disambiguation banner (F21 fix):                       */}
      {/* "Yüzey" = shell/layout seçimi (Bridge/Horizon/Legacy).         */}
      {/* "Tema"  = renk paleti (Obsidian Slate, Horizon Midnight...).   */}
      {/* -------------------------------------------------------------- */}
      <div
        className="mb-4 rounded-md border border-border-subtle bg-surface-card p-4 text-xs leading-relaxed text-neutral-700"
        data-testid="theme-concept-banner"
      >
        <div className="font-semibold text-neutral-900 text-sm mb-1">
          İki farklı ayar — karıştırmayın
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-700">Bölüm 1 · Arayüz Yüzeyi</span>
            <p className="m-0 mt-1">
              Panelin <strong>şeklini</strong> belirler: sol rail, üst bar, sayfa yerleşimi. Örn. Bridge, Horizon, Legacy.
            </p>
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-700">Bölüm 2 · Renk Teması</span>
            <p className="m-0 mt-1">
              Arayüzün <strong>renklerini ve tipografisini</strong> belirler: paletler, tonlar, yazı tipi. Örn. Obsidian Slate, Horizon Midnight.
            </p>
          </div>
        </div>
        <p className="m-0 mt-2 text-[11px] text-neutral-500">
          Yüzey ve tema bağımsızdır — Bridge yüzeyinde Horizon Midnight teması çalışabilir.
        </p>
      </div>

      {/* ============================================================= */}
      {/* Bölüm 1 — Arayüz Yüzeyi (Surface)                              */}
      {/* ============================================================= */}
      <div data-testid="theme-page-surface-section" className="mb-6">
        <div className="mb-2">
          <h2 className="m-0 text-base font-semibold text-neutral-900">
            1 · Arayüz Yüzeyi
          </h2>
          <p className="m-0 text-xs text-neutral-500">
            Admin panelinin shell yapısını seçin. Bu seçim yalnızca admin panelini etkiler.
          </p>
        </div>
        <SurfacePickerSection scope="admin" />
      </div>

      {/* ============================================================= */}
      {/* Bölüm 2 — Renk Teması (Color Theme)                            */}
      {/* ============================================================= */}
      <div data-testid="theme-page-color-section">
        <div className="mb-2">
          <h2 className="m-0 text-base font-semibold text-neutral-900">
            2 · Renk Teması
          </h2>
          <p className="m-0 text-xs text-neutral-500">
            Arayüzün renk paletini ve tipografisini seçin. Seçim tüm panellere uygulanır.
          </p>
        </div>

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
                onPreview={() => setPreviewTheme(theme)}
              />
            ))}
          </div>
        </SectionShell>
      </div>

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
      <ThemeImportForm onImport={handleImport} />

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
