/**
 * HorizonUserLayout — User layout for Horizon design mode
 *
 * Same Horizon design language as admin but with simplified nav.
 * Updated: 56px icon rail, sticky header.
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
  useGlobalSSE();

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface-page" data-testid="horizon-user-layout">
        <ToastContainer />
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        <HorizonSidebar groups={HORIZON_USER_GROUPS} brandLabel="ContentHub" />

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

            <span className="font-medium text-neutral-700 text-xs flex-1">Kullanici Paneli</span>

            <div className="flex items-center gap-2 shrink-0">
              <NotificationBell />
              <button
                onClick={() => navigate("/admin")}
                className="px-3 py-1 text-xs font-medium text-neutral-600 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer transition-all duration-fast hover:bg-neutral-100 hover:border-brand-400"
                data-testid="horizon-panel-switch"
              >
                Yonetim Paneli
              </button>
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
