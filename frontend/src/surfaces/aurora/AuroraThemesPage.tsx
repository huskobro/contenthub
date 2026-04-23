/**
 * Aurora Themes — port of design/contenthub/pages/admin/themes.html.
 * Theme gallery with mini-cockpit previews + click-to-activate. Backed by
 * the live themeStore: kart tıklaması setActiveTheme'i çağırır ve DOM'a
 * uygulanır.
 *
 * Faz 6 P0-5: Tema kart galerisi + inspector. Import/export/remove gibi
 * gelişmiş yönetim işlemleri legacy ThemeRegistryPage'de kalır; aurora
 * sürümü "kullanıcı tarafı" tema seçimi UX'ini hedefler.
 */
import { useMemo } from "react";
import { useThemeStore } from "../../stores/themeStore";
import { applyThemeToDOM } from "../../components/design-system/themeEngine";
import {
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import type { ThemeManifest } from "../../components/design-system/themeContract";

// --- helpers ---------------------------------------------------------------

// Aurora curated gallery allow-list.
// The Aurora surface CSS scopes its semantic tokens under
//   [data-surface="aurora"][data-theme="<id>"]
// and only ships overrides for a curated set of theme ids (see
// frontend/src/styles/aurora/tokens.css). Themes outside this set are
// not registered in the BUILTIN_THEMES array (see themeStore.ts), so
// they do not reach this page in practice. We keep an explicit
// allow-list here as a defense-in-depth guard — if the store ever ships
// a theme without an Aurora token block, the gallery filters it out
// instead of rendering a broken preview card.
//
// Keep this set in lock-step with the token blocks in tokens.css.
const AURORA_BOUND_THEME_IDS = new Set<string>([
  "aurora-dusk",
  "obsidian-slate",
  "void-terminal",
  "tokyo-neon",
  "ink-and-wire",
  "nordic-frost",
]);

function themeIsAuroraBound(theme: ThemeManifest): boolean {
  return AURORA_BOUND_THEME_IDS.has(theme.id);
}

interface PreviewColors {
  bg: string;
  surface: string;
  sidebar: string;
  accent: string;
  text: string;
  // Identity-pass additions — surface each theme's signature so the gallery
  // differentiates at a glance instead of showing five dark squares with
  // different accent dots.
  onAccent: string;
  borderStrong: string;
  textMuted: string;
  radiusMd: string;
  radiusSm: string;
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  density: "compact" | "comfortable" | "spacious";
  isLight: boolean;
  shadowSm: string;
}

function deriveColors(theme: ThemeManifest): PreviewColors {
  const c = theme.colors;
  const pageHex = c.surface.page.replace("#", "");
  const isLight = (() => {
    if (pageHex.length !== 6) return false;
    const r = parseInt(pageHex.slice(0, 2), 16);
    const g = parseInt(pageHex.slice(2, 4), 16);
    const b = parseInt(pageHex.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 170;
  })();
  return {
    bg: c.surface.page,
    surface: c.surface.card,
    sidebar: c.surface.sidebar,
    accent: c.brand[500] || c.brand[600],
    text: isLight ? c.neutral[900] || c.neutral[800] : c.neutral[100] || c.neutral[50],
    onAccent: "#ffffff",
    borderStrong: c.border.strong,
    textMuted: isLight ? c.neutral[600] || c.neutral[500] : c.neutral[500] || c.neutral[400],
    radiusMd: theme.radius.md,
    radiusSm: theme.radius.sm,
    headingFont: theme.typography.heading.stack,
    bodyFont: theme.typography.body.stack,
    monoFont: theme.typography.mono.stack,
    density: theme.density,
    isLight,
    shadowSm: theme.shadow.sm,
  };
}

// --- preview component -----------------------------------------------------

function ThemePreview({ colors }: { colors: PreviewColors }) {
  const divider = colors.isLight
    ? "rgba(17, 21, 27, 0.06)"
    : "rgba(255, 255, 255, 0.08)";
  const railInactive = colors.isLight
    ? "rgba(255, 255, 255, 0.22)"
    : "rgba(255, 255, 255, 0.18)";
  const chipBg = colors.isLight
    ? "rgba(17, 21, 27, 0.06)"
    : "rgba(255, 255, 255, 0.08)";
  return (
    <div className="theme-preview" style={{ background: colors.bg }}>
      <div
        className="tp-bar"
        style={{
          background: colors.sidebar,
          borderBottom: `1px solid ${divider}`,
        }}
      >
        {[colors.accent, "#ef4444", "#f59e0b"].map((c, i) => (
          <div
            key={i}
            className="tp-dot"
            style={{ background: c, opacity: i === 0 ? 1 : 0.5 }}
          />
        ))}
      </div>
      <div className="tp-body">
        <div
          className="tp-rail"
          style={{
            background: colors.sidebar,
            borderRight: `1px solid ${divider}`,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: colors.radiusSm,
                margin: "6px auto",
                background: i === 1 ? colors.accent : railInactive,
              }}
            />
          ))}
        </div>
        <div className="tp-content">
          <div
            className="tp-card"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: colors.radiusMd,
              boxShadow: colors.shadowSm,
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {/* Heading sample — font family tells Inter/Sora/Playfair apart */}
            <div
              style={{
                fontFamily: colors.headingFont,
                fontSize: 11,
                fontWeight: 600,
                color: colors.text,
                lineHeight: 1.1,
                letterSpacing:
                  colors.density === "compact" ? "0.01em" : "-0.005em",
              }}
            >
              Aa
            </div>
            {/* Body lines — show typographic rhythm per theme */}
            <div
              className="tp-line"
              style={{ background: colors.text, opacity: 0.75, width: "72%" }}
            />
            <div
              className="tp-line"
              style={{ background: colors.text, opacity: 0.35, width: "46%" }}
            />
          </div>
          {/* Button + chip row — shows radius/shape/typographic signature */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div
              style={{
                flex: "0 0 42%",
                height: 20,
                borderRadius: colors.radiusMd,
                background: colors.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.onAccent,
                fontFamily: colors.bodyFont,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.02em",
                boxShadow: colors.shadowSm,
              }}
            >
              Kaydet
            </div>
            <div
              style={{
                height: 20,
                padding: "0 6px",
                borderRadius: colors.radiusSm,
                background: chipBg,
                color: colors.textMuted,
                fontFamily: colors.monoFont,
                fontSize: 8,
                fontWeight: 500,
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
              }}
            >
              v1.0
            </div>
            <div
              style={{
                flex: 1,
                height: 20,
                borderRadius: colors.radiusMd,
                background: "transparent",
                border: `1px solid ${colors.borderStrong}`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- page ------------------------------------------------------------------

export function AuroraThemesPage() {
  const allThemes = useThemeStore((s) => s.themes);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const setActiveTheme = useThemeStore((s) => s.setActiveTheme);
  const activeThemeFn = useThemeStore((s) => s.activeTheme);

  // Aurora curation wave — the gallery shows ONLY themes that carry a full
  // Aurora token block in `frontend/src/styles/aurora/tokens.css`. A theme
  // without Aurora coverage would silently fall back to Dusk tokens inside
  // Aurora panels (the old "partial" state); we refuse to list it at all so
  // users can never click into a half-applied preview. Non-Aurora surfaces
  // (legacy, horizon fallback) expose their own switchers and can still
  // accept any registered theme.
  const themes = useMemo(() => allThemes.filter(themeIsAuroraBound), [allThemes]);

  const activeTheme = activeThemeFn();
  const activeColors = useMemo(() => deriveColors(activeTheme), [activeTheme]);

  function handleActivate(id: string) {
    setActiveTheme(id);
    const theme = allThemes.find((t) => t.id === id);
    if (theme) applyThemeToDOM(theme);
  }

  // Post-curation: `themes` above is already filtered to Aurora-bound ids, so
  // every card in the gallery renders a real preview and the inspector
  // always shows "tam uygulanıyor" for the active theme.

  const inspectorRows: Array<[string, string]> = [
    ["page", activeColors.bg],
    ["surface", activeColors.surface],
    ["sidebar", activeColors.sidebar],
    ["accent", activeColors.accent],
    ["text", activeColors.text],
  ];

  const inspector = (
    <AuroraInspector title="Aktif tema">
      <AuroraInspectorSection title={activeTheme.name}>
        {inspectorRows.map(([k, v]) => (
          <AuroraInspectorRow
            key={k}
            label={k}
            value={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: v,
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{v}</span>
              </span>
            }
          />
        ))}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Detay">
        <AuroraInspectorRow label="id" value={activeTheme.id} />
        <AuroraInspectorRow label="versiyon" value={activeTheme.version} />
        <AuroraInspectorRow label="yazar" value={activeTheme.author} />
        <AuroraInspectorRow
          label="aurora uyumu"
          value={
            <span style={{ color: "var(--state-success-fg)" }}>
              tam uygulanıyor
            </span>
          }
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-themes">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Tema galerisi</h1>
            <div className="sub">
              {themes.length} tema · {activeTheme.name} aktif
            </div>
          </div>
        </div>
        <div className="grid-3">
          {themes.map((t) => {
            const colors = deriveColors(t);
            const active = t.id === activeThemeId;
            return (
              <div
                key={t.id}
                className={"theme-card" + (active ? " active" : "")}
                onClick={() => handleActivate(t.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleActivate(t.id);
                  }
                }}
              >
                <ThemePreview colors={colors} />
                {active && <div className="active-badge">AKTİF</div>}
                <div className="theme-info">
                  <div className="t-name">{t.name}</div>
                  <div className="t-desc">{t.description}</div>
                  <div className="t-meta">
                    {[colors.bg, colors.surface, colors.accent, colors.text].map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: c,
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      />
                    ))}
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginLeft: "auto",
                      }}
                    >
                      {t.id}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
