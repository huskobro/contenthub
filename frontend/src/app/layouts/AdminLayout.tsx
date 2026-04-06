import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { AdminContinuityStrip } from "../../components/layout/AdminContinuityStrip";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { CommandPalette } from "../../components/design-system/CommandPalette";
import { NotificationCenter } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { buildAdminNavigationCommands, buildAdminActionCommands } from "../../commands/adminCommands";
import { buildContextualCommands } from "../../commands/contextualCommands";
import { useAdminVisibilityMap, filterAdminNav } from "./useLayoutNavigation";

export function AdminLayout() {
  const visibilityMap = useAdminVisibilityMap();
  const filteredNav = filterAdminNav(visibilityMap);
  const navigate = useNavigate();
  const location = useLocation();

  // Register command palette shortcut (Cmd+K / Ctrl+K)
  useCommandPaletteShortcut();

  // Global SSE for app-wide notifications and query invalidation
  useGlobalSSE();

  // Update command palette context on route change
  useEffect(() => {
    useCommandPaletteStore.getState().setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

  // Register admin commands + contextual commands on mount
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
      <div className="flex min-h-screen">
        {/* Toast notifications */}
        <ToastContainer />
        {/* Command Palette overlay */}
        <CommandPalette />
        {/* Notification Center panel */}
        <NotificationCenter />
        {/* Keyboard shortcuts help (? key) */}
        <KeyboardShortcutsHelp />

        {/* Dark sidebar on the left */}
        <AppSidebar items={filteredNav} />

        {/* Right side: header + continuity strip + scrollable content */}
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader area="Admin" />
          <AdminContinuityStrip />
          <main className="flex-1 p-4 bg-surface-page overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
