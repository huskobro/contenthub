/**
 * HorizonAdminLayout — Premium admin layout for Horizon design mode
 *
 * - Sticky header bar with breadcrumb + actions
 * - Icon rail (56px) + expanding context panel (256px)
 * - Content area offset by icon rail
 * - CM-inspired visual hierarchy
 */

import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { HorizonSidebar } from "../../components/layout/HorizonSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { CommandPalette } from "../../components/design-system/CommandPalette";
import { NotificationCenter, NotificationBell } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { buildAdminNavigationCommands, buildAdminActionCommands } from "../../commands/adminCommands";
import { buildContextualCommands } from "../../commands/contextualCommands";
import { useAdminVisibilityMap, filterHorizonAdminGroups } from "./useLayoutNavigation";
import { useEnabledModules } from "../../hooks/useEnabledModules";

// ---------------------------------------------------------------------------
// Route label mapping for breadcrumb
// ---------------------------------------------------------------------------

const ROUTE_LABELS: Record<string, string> = {
  admin: "Yonetim",
  settings: "Ayarlar",
  visibility: "Gorunurluk",
  "wizard-settings": "Wizard Ayarlari",
  jobs: "Isler",
  "audit-logs": "Audit Log",
  library: "Icerik Kutuphanesi",
  assets: "Varlik Kutuphanesi",
  "standard-videos": "Standart Video",
  wizard: "Wizard",
  templates: "Sablonlar",
  "style-blueprints": "Stil Sablonlari",
  "template-style-links": "Sablon-Stil Baglantilari",
  publish: "Yayin Merkezi",
  analytics: "Analytics",
  youtube: "YouTube",
  sources: "Kaynaklar",
  "source-scans": "Kaynak Taramalari",
  "news-bulletins": "Haber Bultenleri",
  "news-items": "Haber Ogeler",
  "used-news": "Kullanilan Haberler",
  themes: "Tema Yonetimi",
};

function getBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "";

  for (const seg of segments) {
    currentPath += "/" + seg;
    crumbs.push({
      label: ROUTE_LABELS[seg] || seg,
      path: currentPath,
    });
  }

  return crumbs;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function HorizonAdminLayout() {
  const visibilityMap = useAdminVisibilityMap();
  const { enabledMap } = useEnabledModules();
  const filteredGroups = filterHorizonAdminGroups(visibilityMap, enabledMap);
  const navigate = useNavigate();
  const location = useLocation();

  useCommandPaletteShortcut();
  useGlobalSSE();

  useEffect(() => {
    useCommandPaletteStore.getState().setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    const navCmds = buildAdminNavigationCommands(navigate);
    const actionCmds = buildAdminActionCommands(navigate);
    const ctxCmds = buildContextualCommands(navigate);
    const allCmds = [...navCmds, ...actionCmds, ...ctxCmds];
    useCommandPaletteStore.getState().registerCommands(allCmds);

    return () => {
      useCommandPaletteStore.getState().unregisterCommands(allCmds.map((c) => c.id));
    };
  }, [navigate]);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface-page" data-testid="horizon-admin-layout">
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        {/* Horizon Sidebar */}
        <HorizonSidebar groups={filteredGroups} brandLabel="ContentHub" />

        {/* Main wrapper — offset by icon rail */}
        <div
          className="min-h-screen flex flex-col transition-[margin] duration-normal"
          style={{ marginLeft: "var(--ch-sidebar-collapsed-width)" }}
        >
          {/* Sticky Header */}
          <header
            className="sticky top-0 z-header flex items-center h-header border-b border-border-subtle shrink-0"
            style={{ backgroundColor: "color-mix(in srgb, var(--ch-surface-page) 85%, transparent)", backdropFilter: "blur(12px)", padding: "0 var(--ch-page-padding)" }}
          >
            {/* Subtle bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--ch-brand-400) 12%, transparent) 50%, transparent 100%)" }}
            />

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs min-w-0 flex-1">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && <span className="text-neutral-400">/</span>}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-neutral-800 truncate">{crumb.label}</span>
                  ) : (
                    <span className="text-neutral-500 truncate">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Command Palette trigger */}
              <button
                onClick={() => useCommandPaletteStore.getState().open()}
                data-testid="header-command-palette"
                title="Komut Paleti (⌘K)"
                className="flex items-center gap-2 px-2.5 py-1 text-xs text-neutral-500 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:border-brand-400 hover:ring-1 hover:ring-brand-400/10"
              >
                <span className="text-neutral-400">Ara...</span>
                <kbd className="text-[10px] font-mono bg-neutral-100 px-1 py-0 rounded border border-border-subtle text-neutral-500 leading-[1.4]">
                  ⌘K
                </kbd>
              </button>

              <NotificationBell />

              <button
                onClick={() => navigate("/user")}
                className="px-3 py-1 text-xs font-medium text-neutral-600 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:bg-neutral-100 hover:border-brand-400"
                data-testid="horizon-panel-switch"
              >
                Kullanici Paneli
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 bg-surface-page overflow-y-auto" style={{ padding: "var(--ch-page-padding)" }}>
            <div className="max-w-page">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
