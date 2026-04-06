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
import { HorizonSidebar } from "../../components/layout/HorizonSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { CommandPalette } from "../../components/design-system/CommandPalette";
import { NotificationCenter, NotificationBell } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { buildAdminNavigationCommands, buildAdminActionCommands } from "../../commands/adminCommands";
import { buildContextualCommands } from "../../commands/contextualCommands";
import { useAdminVisibilityMap, filterHorizonAdminGroups } from "./useLayoutNavigation";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function HorizonAdminLayout() {
  const visibilityMap = useAdminVisibilityMap();
  const filteredGroups = filterHorizonAdminGroups(visibilityMap);
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
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        {/* Horizon Sidebar */}
        <HorizonSidebar groups={filteredGroups} brandLabel="ContentHub" />

        {/* Main Content — offset by icon rail width */}
        <main
          className="ml-[48px] min-h-screen p-4 pt-4 bg-surface-page overflow-y-auto transition-[margin] duration-normal"
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
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => navigate("/user")}
                className="px-3 py-1 text-xs font-medium text-neutral-600 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:bg-neutral-100 hover:border-brand-400"
                data-testid="horizon-panel-switch"
              >
                Kullanici Paneli
              </button>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  );
}
