/**
 * HorizonUserLayout — Radical new user layout for Horizon design mode
 *
 * Same Horizon design language as admin but with simplified nav.
 */

import { Outlet, useNavigate } from "react-router-dom";
import { HorizonSidebar } from "../../components/layout/HorizonSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { NotificationCenter, NotificationBell } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { HORIZON_USER_GROUPS } from "./useLayoutNavigation";

export function HorizonUserLayout() {
  const navigate = useNavigate();

  // Global SSE for app-wide notifications and query invalidation
  useGlobalSSE();

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface-page" data-testid="horizon-user-layout">
        <ToastContainer />
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        <HorizonSidebar groups={HORIZON_USER_GROUPS} brandLabel="ContentHub" />

        <main
          className="ml-[48px] min-h-screen p-4 pt-4 bg-surface-page overflow-y-auto transition-[margin] duration-normal"
        >
          <div className="flex items-center justify-between mb-4 max-w-page">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="font-medium text-neutral-700">Kullanici</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => navigate("/admin")}
                className="px-3 py-1 text-xs font-medium text-neutral-600 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:bg-neutral-100 hover:border-brand-400"
                data-testid="horizon-panel-switch"
              >
                Yonetim Paneli
              </button>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  );
}
