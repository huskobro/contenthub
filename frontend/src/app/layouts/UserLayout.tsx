import { Outlet } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { NotificationCenter } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { useNotifications } from "../../hooks/useNotifications";
import { USER_NAV } from "./useLayoutNavigation";

export function UserLayout() {
  // Global SSE for app-wide notifications and query invalidation
  useGlobalSSE();
  // Backend-backed notification data sync (user scope — only my notifications)
  useNotifications({ mode: "user" });
  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-screen">
        <ToastContainer />
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
