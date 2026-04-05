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
import { colors, typography, spacing, radius, shadow, transition } from "../../components/design-system/tokens";
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
      style={{
        border: `1px solid ${t.colors.border.default}`,
        borderRadius: radius.lg,
        overflow: "hidden",
        background: t.colors.surface.page,
      }}
      data-testid="theme-preview-panel"
    >
      {/* Header bar */}
      <div
        style={{
          background: t.colors.surface.sidebar,
          padding: `${spacing[3]} ${spacing[4]}`,
          display: "flex",
          alignItems: "center",
          gap: spacing[2],
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: radius.md,
            background: t.colors.brand[600],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
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
      <div style={{ padding: spacing[4] }}>
        {/* Text samples */}
        <h4
          style={{
            margin: `0 0 ${spacing[2]}`,
            fontSize: t.typography.size.lg,
            fontWeight: t.typography.weight.semibold,
            color: t.colors.neutral[900],
            fontFamily: t.typography.heading.stack,
          }}
        >
          Baslik Ornegi
        </h4>
        <p
          style={{
            margin: `0 0 ${spacing[3]}`,
            fontSize: t.typography.size.base,
            color: t.colors.neutral[600],
            fontFamily: t.typography.body.stack,
            lineHeight: t.typography.lineHeight.normal,
          }}
        >
          Bu bir onizleme metnidir. Temanin tipografi ve renk tonlarini gosterir.
        </p>

        {/* Badges */}
        <div style={{ display: "flex", gap: spacing[2], flexWrap: "wrap", marginBottom: spacing[3] }}>
          {[
            { label: "Basarili", bg: t.colors.success.light, fg: t.colors.success.text },
            { label: "Uyari", bg: t.colors.warning.light, fg: t.colors.warning.text },
            { label: "Hata", bg: t.colors.error.light, fg: t.colors.error.text },
            { label: "Bilgi", bg: t.colors.info.light, fg: t.colors.info.text },
          ].map((b) => (
            <span
              key={b.label}
              style={{
                display: "inline-block",
                padding: `${spacing[1]} ${spacing[2]}`,
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
        <div style={{ display: "flex", gap: spacing[2], marginBottom: spacing[3] }}>
          <span
            style={{
              display: "inline-block",
              padding: `${spacing[2]} ${spacing[4]}`,
              borderRadius: t.radius.md,
              background: t.colors.brand[600],
              color: "#fff",
              fontSize: t.typography.size.base,
              fontWeight: t.typography.weight.medium,
              fontFamily: t.typography.body.stack,
            }}
          >
            Birincil
          </span>
          <span
            style={{
              display: "inline-block",
              padding: `${spacing[2]} ${spacing[4]}`,
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
          style={{
            border: `1px solid ${t.colors.border.subtle}`,
            borderRadius: t.radius.md,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: t.typography.body.stack }}>
            <thead>
              <tr style={{ background: t.colors.neutral[100] }}>
                <th style={{ padding: `${spacing[2]} ${spacing[3]}`, fontSize: t.typography.size.xs, fontWeight: t.typography.weight.semibold, color: t.colors.neutral[600], textAlign: "left" }}>Kolon</th>
                <th style={{ padding: `${spacing[2]} ${spacing[3]}`, fontSize: t.typography.size.xs, fontWeight: t.typography.weight.semibold, color: t.colors.neutral[600], textAlign: "left" }}>Deger</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: `${spacing[2]} ${spacing[3]}`, fontSize: t.typography.size.sm, color: t.colors.neutral[900], borderTop: `1px solid ${t.colors.border.subtle}` }}>Ornek satir</td>
                <td style={{ padding: `${spacing[2]} ${spacing[3]}`, fontSize: t.typography.size.sm, color: t.colors.neutral[600], borderTop: `1px solid ${t.colors.border.subtle}`, fontFamily: t.typography.mono.stack }}>42</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mono sample */}
        <div
          style={{
            marginTop: spacing[3],
            padding: spacing[3],
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
      style={{
        border: `1px solid ${isActive ? colors.brand[400] : colors.border.default}`,
        borderRadius: radius.lg,
        padding: spacing[5],
        background: isActive ? colors.brand[50] : colors.surface.card,
        boxShadow: isActive ? shadow.sm : shadow.xs,
        transition: `border-color ${transition.fast}, background ${transition.fast}`,
      }}
      data-testid={`theme-card-${theme.id}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing[2] }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: spacing[2] }}>
            <h3
              style={{
                margin: 0,
                fontSize: typography.size.md,
                fontWeight: typography.weight.semibold,
                color: colors.neutral[900],
              }}
            >
              {theme.name}
            </h3>
            {isActive && <StatusBadge status="active" label="Aktif" />}
            {isBuiltin && (
              <span
                style={{
                  fontSize: typography.size.xs,
                  color: colors.neutral[500],
                  fontStyle: "italic",
                }}
              >
                yerlesik
              </span>
            )}
          </div>
          <p
            style={{
              margin: `${spacing[1]} 0 0`,
              fontSize: typography.size.sm,
              color: colors.neutral[600],
              lineHeight: typography.lineHeight.normal,
            }}
          >
            {theme.description}
          </p>
        </div>

        {/* Color swatch */}
        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          {[theme.colors.brand[500], theme.colors.neutral[700], theme.colors.success.base, theme.colors.warning.base, theme.colors.error.base].map(
            (c, i) => (
              <div
                key={i}
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "3px",
                  background: c,
                }}
              />
            )
          )}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: spacing[3], fontSize: typography.size.xs, color: colors.neutral[500], marginBottom: spacing[3], flexWrap: "wrap" }}>
        <span>v{theme.version}</span>
        <span>{theme.author}</span>
        <span>{theme.typography.body.family}</span>
        <span>{theme.tone.join(", ")}</span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: spacing[2], flexWrap: "wrap" }}>
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
        style={{
          width: "100%",
          minHeight: "200px",
          padding: spacing[3],
          fontSize: typography.size.sm,
          fontFamily: typography.monoFamily,
          border: `1px solid ${errors.length > 0 ? colors.error.base : colors.border.default}`,
          borderRadius: radius.md,
          background: colors.surface.card,
          color: colors.neutral[900],
          resize: "vertical",
          lineHeight: typography.lineHeight.normal,
        }}
        data-testid="theme-import-textarea"
      />

      {errors.length > 0 && (
        <div
          style={{
            marginTop: spacing[2],
            padding: spacing[3],
            background: colors.error.light,
            borderRadius: radius.md,
            fontSize: typography.size.sm,
            color: colors.error.text,
          }}
          data-testid="theme-import-errors"
        >
          <strong>Dogrulama Hatalari:</strong>
          <ul style={{ margin: `${spacing[1]} 0 0`, paddingLeft: spacing[4] }}>
            {errors.map((err, i) => (
              <li key={i}>
                {err.path && <code style={{ fontFamily: typography.monoFamily }}>{err.path}</code>}
                {err.path && ": "}
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div
          style={{
            marginTop: spacing[2],
            padding: spacing[3],
            background: colors.success.light,
            borderRadius: radius.md,
            fontSize: typography.size.sm,
            color: colors.success.text,
          }}
          data-testid="theme-import-success"
        >
          Tema basariyla import edildi!
        </div>
      )}

      <div style={{ marginTop: spacing[3], display: "flex", gap: spacing[2] }}>
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
      subtitle="Sistemdeki temalar. Aktif temayi degistirebilir, yeni tema import edebilir ve tema onizlemesi gorebilirsiniz."
      testId="theme-registry"
    >
      {/* Active theme info */}
      <SectionShell
        title="Aktif Tema"
        testId="theme-active-section"
      >
        {(() => {
          const active = themes.find((t) => t.id === activeThemeId);
          if (!active) return <p style={{ color: colors.neutral[500] }}>Aktif tema bulunamadi.</p>;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: spacing[3] }}>
              <div style={{ display: "flex", gap: "2px" }}>
                {[active.colors.brand[500], active.colors.neutral[700], active.colors.success.base].map((c, i) => (
                  <div key={i} style={{ width: "20px", height: "20px", borderRadius: radius.sm, background: c }} />
                ))}
              </div>
              <div>
                <span style={{ fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.neutral[900] }}>
                  {active.name}
                </span>
                <span style={{ marginLeft: spacing[2], fontSize: typography.size.sm, color: colors.neutral[500] }}>
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
        <div style={{ display: "grid", gap: spacing[4] }}>
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
        style={{
          marginTop: spacing[4],
          padding: spacing[4],
          background: colors.info.light,
          borderRadius: radius.lg,
          fontSize: typography.size.sm,
          color: colors.info.text,
          lineHeight: typography.lineHeight.relaxed,
        }}
        data-testid="theme-authoring-hint"
      >
        <strong>AI ile Tema Uretme:</strong> Bir AI'ye "ContentHub ThemeManifest JSON uretten" deyip
        sonucu yukaridaki alana yapistirabilirsiniz. Tema otomatik dogrulanir ve sisteme eklenir.
        Gecerli bir tema ornegi icin mevcut bir temayi "Disari Aktar" ile kopyalayip referans alabilirsiniz.
      </div>
    </PageShell>
  );
}
