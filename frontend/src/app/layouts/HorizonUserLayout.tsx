/**
 * HorizonUserLayout — User layout for Horizon design mode
 *
 * Same Horizon design language as admin but with simplified nav.
 * Updated: 56px icon rail, sticky header.
 *
 * 2026-04-11 audit sweep:
 *   - Module-enabled filter wired in (filterHorizonUserGroups) so disabled
 *     modules no longer leak into user nav.
 *   - Command palette + useCommandPaletteShortcut + user command registration
 *     added (parity with CanvasUserLayout / AdminLayout). Cmd+K now works.
 *   - useNotifications({ mode: "user" }) added — notification data sync.
 *   - Admin role guard on the panel switch button (non-admin users no longer
 *     see a button they cannot use).
 *   - Cmd/Ctrl+Shift+A keyboard shortcut for admin → /admin.
 */

import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { HorizonSidebar } from "../../components/layout/HorizonSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { CommandPalette } from "../../components/design-system/CommandPalette";
import {
  NotificationCenter,
  NotificationBell,
} from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { useNotifications } from "../../hooks/useNotifications";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import {
  buildUserNavigationCommands,
  buildUserActionCommands,
} from "../../commands/userCommands";
import { useAuthStore } from "../../stores/authStore";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import { filterHorizonUserGroups } from "./useLayoutNavigation";

export function HorizonUserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === "admin";

  // Infra hooks — parity with CanvasUserLayout / AdminLayout.
  useCommandPaletteShortcut();
  useGlobalSSE();
  useNotifications({ mode: "user" });

  // Module-aware nav filter: disabled modules drop out of the sidebar.
  const { enabledMap } = useEnabledModules();
  const filteredGroups = filterHorizonUserGroups(enabledMap);

  // Track current route inside the palette context.
  useEffect(() => {
    useCommandPaletteStore
      .getState()
      .setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

  // Register user commands on mount (Cmd+K support).
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

  // Admin-only keyboard shortcut: Cmd/Ctrl+Shift+A → admin panel.
  useEffect(() => {
    if (!isAdmin) return undefined;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        e.stopPropagation();
        navigate("/admin");
      }
    }
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true });
  }, [isAdmin, navigate]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface-page" data-testid="horizon-user-layout">
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        <HorizonSidebar groups={filteredGroups} brandLabel="ContentHub" />

        <div
          className="min-h-screen flex flex-col transition-[margin] duration-normal"
          style={{ marginLeft: "var(--ch-sidebar-collapsed-width)" }}
        >
          {/* Sticky Header */}
          <header
            className="sticky top-0 z-header flex items-center h-header border-b border-border-subtle shrink-0"
            style={{ backgroundColor: "color-mix(in srgb, var(--ch-surface-page) 85%, transparent)", backdropFilter: "blur(12px)", padding: "0 var(--ch-page-padding)" }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--ch-brand-400) 12%, transparent) 50%, transparent 100%)" }}
            />

            <span className="font-medium text-neutral-700 text-xs flex-1">Kullanıcı Paneli</span>

            <div className="flex items-center gap-2 shrink-0">
              {/* Command palette trigger — parity with HorizonAdminLayout */}
              <button
                onClick={() => useCommandPaletteStore.getState().open()}
                data-testid="horizon-user-command-palette"
                title="Komut Paleti (⌘K)"
                className="flex items-center gap-2 px-2.5 py-1 text-xs text-neutral-500 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:border-brand-400 hover:ring-1 hover:ring-brand-400/10"
              >
                <span className="text-neutral-400">Ara...</span>
                <kbd className="text-[10px] font-mono bg-neutral-100 px-1 py-0 rounded border border-border-subtle text-neutral-500 leading-[1.4]">
                  ⌘K
                </kbd>
              </button>

              <NotificationBell />

              {/* Admin-only panel switch — non-admin users don't see this */}
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  title="Yönetim Paneli (Cmd+Shift+A)"
                  aria-label="Yönetim Paneli"
                  className="px-3 py-1 text-xs font-medium text-neutral-600 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:bg-neutral-100 hover:border-brand-400"
                  data-testid="horizon-panel-switch"
                >
                  Yönetim Paneli
                </button>
              )}
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 bg-surface-page overflow-y-auto" style={{ padding: "var(--ch-page-padding)" }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
