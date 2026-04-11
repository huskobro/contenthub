/**
 * UserLayout — Legacy user shell.
 *
 * 2026-04-11: CommandPalette + useCommandPaletteShortcut + user command
 * registration added. Previously, Cmd+K did nothing on the legacy surface;
 * users who stayed on legacy silently lost navigation parity with
 * Canvas/Atrium/Horizon.
 */

import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { CommandPalette } from "../../components/design-system/CommandPalette";
import { NotificationCenter } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { useNotifications } from "../../hooks/useNotifications";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import {
  buildUserNavigationCommands,
  buildUserActionCommands,
} from "../../commands/userCommands";
import { USER_NAV } from "./useLayoutNavigation";

export function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Cmd+K / Ctrl+K palette opener
  useCommandPaletteShortcut();
  // Global SSE for app-wide notifications and query invalidation
  useGlobalSSE();
  // Backend-backed notification data sync (user scope — only my notifications)
  useNotifications({ mode: "user" });

  // Update command palette context on route change
  useEffect(() => {
    useCommandPaletteStore
      .getState()
      .setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

  // Register user commands on mount
  useEffect(() => {
    const navCmds = buildUserNavigationCommands(navigate);
    const actionCmds = buildUserActionCommands(navigate);
    const allCmds = [...navCmds, ...actionCmds];
    useCommandPaletteStore.getState().registerCommands(allCmds);
    return () => {
      useCommandPaletteStore
        .getState()
        .unregisterCommands(allCmds.map((c) => c.id));
    };
  }, [navigate]);

  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-screen">
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />
        <AppHeader area="User" />
        <div className="flex flex-1">
          <AppSidebar items={USER_NAV} />
          <main className="flex-1 bg-surface-page overflow-y-auto" style={{ padding: "var(--ch-page-padding)" }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
