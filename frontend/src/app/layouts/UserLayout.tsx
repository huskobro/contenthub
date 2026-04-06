import { Outlet } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { ToastContainer } from "../../components/design-system/Toast";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { NotificationCenter } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";

const USER_NAV = [
  { label: "Anasayfa", to: "/user" },
  { label: "Icerik", to: "/user/content" },
  { label: "Yayin", to: "/user/publish" },
];

export function UserLayout() {
  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-screen">
        <ToastContainer />
        <NotificationCenter />
        <KeyboardShortcutsHelp />
        <AppHeader area="User" />
        <div className="flex flex-1">
          <AppSidebar items={USER_NAV} />
          <main className="flex-1 p-6 bg-surface-page overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
