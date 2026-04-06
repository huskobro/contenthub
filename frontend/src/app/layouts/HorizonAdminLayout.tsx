/**
 * HorizonAdminLayout — Radical new admin layout for Horizon design mode
 *
 * Key differences from classic AdminLayout:
 * - No header bar — brand + search in sidebar context panel
 * - Icon rail (48px) + expanding context panel (240px)
 * - Content area starts directly from top, full viewport height
 * - Monochromatic layered surfaces
 * - Spring-based page transitions
 */

import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { HorizonSidebar, type HorizonNavGroup } from "../../components/layout/HorizonSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { CommandPalette } from "../../components/design-system/CommandPalette";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { buildAdminNavigationCommands, buildAdminActionCommands } from "../../commands/adminCommands";
import { buildContextualCommands } from "../../commands/contextualCommands";
import { useVisibility } from "../../hooks/useVisibility";

// ---------------------------------------------------------------------------
// Navigation groups for Horizon icon rail
// ---------------------------------------------------------------------------

const HORIZON_ADMIN_GROUPS: HorizonNavGroup[] = [
  {
    id: "overview",
    label: "Genel",
    icon: "\u25C9",
    items: [
      { label: "Genel Bakis", to: "/admin" },
    ],
  },
  {
    id: "system",
    label: "Sistem",
    icon: "\u2699",
    items: [
      { label: "Ayarlar", to: "/admin/settings" },
      { label: "Gorunurluk", to: "/admin/visibility" },
      { label: "Isler", to: "/admin/jobs" },
      { label: "Audit Log", to: "/admin/audit-logs" },
    ],
  },
  {
    id: "content",
    label: "Icerik Uretimi",
    icon: "\u270E",
    items: [
      { label: "Icerik Kutuphanesi", to: "/admin/library" },
      { label: "Varlik Kutuphanesi", to: "/admin/assets" },
      { label: "Standart Video", to: "/admin/standard-videos" },
      { label: "Sablonlar", to: "/admin/templates" },
      { label: "Stil Sablonlari", to: "/admin/style-blueprints" },
      { label: "Sablon-Stil Baglantilari", to: "/admin/template-style-links" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "\u2261",
    items: [
      { label: "Analytics", to: "/admin/analytics" },
      { label: "YouTube Analytics", to: "/admin/analytics/youtube" },
    ],
  },
  {
    id: "news",
    label: "Haber",
    icon: "\u2139",
    items: [
      { label: "Kaynaklar", to: "/admin/sources" },
      { label: "Kaynak Taramalari", to: "/admin/source-scans" },
      { label: "Haber Bultenleri", to: "/admin/news-bulletins" },
      { label: "Haber Ogeler", to: "/admin/news-items" },
      { label: "Kullanilan Haberler", to: "/admin/used-news" },
    ],
  },
  {
    id: "appearance",
    label: "Gorunum",
    icon: "\u25D0",
    items: [
      { label: "Tema Yonetimi", to: "/admin/themes" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Visibility-filtered groups
// ---------------------------------------------------------------------------

function useFilteredGroups(): HorizonNavGroup[] {
  const settings = useVisibility("panel:settings");
  const visibility = useVisibility("panel:visibility");
  const templates = useVisibility("panel:templates");
  const analytics = useVisibility("panel:analytics");
  const sources = useVisibility("panel:sources");

  const guardMap: Record<string, boolean> = {
    "/admin/settings": settings.visible,
    "/admin/visibility": visibility.visible,
    "/admin/templates": templates.visible,
    "/admin/analytics": analytics.visible,
    "/admin/analytics/youtube": analytics.visible,
    "/admin/sources": sources.visible,
  };

  return HORIZON_ADMIN_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const guard = guardMap[item.to];
      return guard !== false;
    }),
  })).filter((group) => group.items.length > 0);
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function HorizonAdminLayout() {
  const filteredGroups = useFilteredGroups();
  const navigate = useNavigate();
  const location = useLocation();

  useCommandPaletteShortcut();

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

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface-page" data-testid="horizon-admin-layout">
        <ToastContainer />
        <CommandPalette />

        {/* Horizon Sidebar */}
        <HorizonSidebar groups={filteredGroups} brandLabel="ContentHub" />

        {/* Main Content — offset by icon rail width */}
        <main
          className="ml-[48px] min-h-screen p-6 bg-surface-page overflow-y-auto transition-[margin] duration-normal"
          style={{ paddingTop: "1.5rem" }}
        >
          {/* Breadcrumb-like context header */}
          <div className="flex items-center justify-between mb-4 max-w-page">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="font-medium text-neutral-700">Yonetim</span>
              <span className="text-neutral-400">/</span>
              <span className="text-neutral-500 capitalize">
                {location.pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Genel Bakis"}
              </span>
            </div>
            <button
              onClick={() => navigate("/user")}
              className="px-3 py-1 text-xs font-medium text-neutral-600 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:bg-neutral-100 hover:border-brand-400"
              data-testid="horizon-panel-switch"
            >
              Kullanici Paneli
            </button>
          </div>

          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  );
}
