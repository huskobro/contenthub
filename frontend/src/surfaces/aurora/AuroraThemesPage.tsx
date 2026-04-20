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

interface PreviewColors {
  bg: string;
  surface: string;
  sidebar: string;
  accent: string;
  text: string;
}

function deriveColors(theme: ThemeManifest): PreviewColors {
  const c = theme.colors;
  return {
    bg: c.surface.page,
    surface: c.surface.card,
    sidebar: c.surface.sidebar,
    accent: c.brand[500] || c.brand[600],
    text: c.neutral[100] || c.neutral[50],
  };
}

// --- preview component -----------------------------------------------------

function ThemePreview({ colors }: { colors: PreviewColors }) {
  return (
    <div className="theme-preview" style={{ background: colors.bg }}>
      <div
        className="tp-bar"
        style={{
          background: colors.sidebar,
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
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
            borderRight: `1px solid rgba(255,255,255,0.06)`,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                margin: "6px auto",
                background: i === 1 ? colors.accent : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
        <div className="tp-content">
          <div
            className="tp-card"
            style={{
              background: colors.surface,
              border: `1px solid rgba(255,255,255,0.07)`,
            }}
          >
            <div
              className="tp-line"
              style={{ background: colors.text, opacity: 0.8, width: "60%" }}
            />
            <div
              className="tp-line"
              style={{ background: colors.text, opacity: 0.4, width: "40%" }}
            />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <div
              style={{
                flex: 1,
                height: 24,
                borderRadius: 4,
                background: colors.accent,
                opacity: 0.9,
              }}
            />
            <div
              style={{
                flex: 1,
                height: 24,
                borderRadius: 4,
                background: colors.surface,
                border: `1px solid rgba(255,255,255,0.1)`,
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
  const themes = useThemeStore((s) => s.themes);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const setActiveTheme = useThemeStore((s) => s.setActiveTheme);
  const activeThemeFn = useThemeStore((s) => s.activeTheme);

  const activeTheme = activeThemeFn();
  const activeColors = useMemo(() => deriveColors(activeTheme), [activeTheme]);

  function handleActivate(id: string) {
    setActiveTheme(id);
    const theme = themes.find((t) => t.id === id);
    if (theme) applyThemeToDOM(theme);
  }

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
