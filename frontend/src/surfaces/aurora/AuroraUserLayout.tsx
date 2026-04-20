/**
 * AuroraUserLayout — user panel için Aurora Dusk Cockpit Shell.
 *
 * 6 rail slot'u, her biri çoklu prefix listesiyle. Tüm `/user/*` rotaları
 * bir slot'a bağlanır; rail'de unutulan rota → "Anasayfa" tek tab açılma
 * bug'ı engellenir.
 *
 *   home      — /user (Anasayfa, Bugün)
 *   projects  — /user/projects, /user/jobs, /user/create, /user/news-picker
 *   publish   — /user/publish, /user/calendar, /user/content
 *   channels  — /user/channels, /user/connections, /user/automation
 *   engage    — /user/inbox, /user/comments, /user/posts, /user/playlists
 *   analytics — /user/analytics, /user/settings
 */

import { useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { ToastContainer } from "../../components/design-system/Toast";
import { CommandPalette } from "../../components/design-system/CommandPalette";
import { NotificationCenter } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { useNotifications } from "../../hooks/useNotifications";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { useAuthStore } from "../../stores/authStore";
import { filterHorizonUserGroups } from "../../app/layouts/useLayoutNavigation";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import { CockpitShell, type AuroraRailSlot } from "./CockpitShell";

const AURORA_USER_RAIL: AuroraRailSlot[] = [
  {
    id: "home",
    label: "Bugün",
    icon: "layout-dashboard",
    matchPrefixes: ["/user"],
    homeRoute: "/user",
    groupIds: ["today"],
  },
  {
    id: "projects",
    label: "Projeler",
    icon: "folder",
    matchPrefixes: ["/user/projects", "/user/jobs", "/user/create", "/user/news-picker"],
    homeRoute: "/user/projects",
    groupIds: ["production"],
  },
  {
    id: "publish",
    label: "Yayın",
    icon: "send",
    matchPrefixes: ["/user/publish", "/user/calendar", "/user/content"],
    homeRoute: "/user/publish",
    groupIds: ["publish"],
  },
  {
    id: "channels",
    label: "Kanallar",
    icon: "tv",
    matchPrefixes: ["/user/channels", "/user/connections", "/user/automation"],
    homeRoute: "/user/channels",
    groupIds: ["channels"],
  },
  {
    id: "engage",
    label: "Etkileşim",
    icon: "message-square",
    matchPrefixes: ["/user/inbox", "/user/comments", "/user/posts", "/user/playlists"],
    homeRoute: "/user/inbox",
    groupIds: ["engagement"],
  },
  {
    id: "analytics",
    label: "Analitik",
    icon: "bar-chart",
    matchPrefixes: ["/user/analytics", "/user/settings"],
    homeRoute: "/user/analytics",
    groupIds: ["analytics", "settings"],
  },
];

export function AuroraUserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const { enabledMap } = useEnabledModules();
  const groups = useMemo(() => filterHorizonUserGroups(enabledMap), [enabledMap]);

  useCommandPaletteShortcut();
  useGlobalSSE();
  useNotifications({ mode: "user" });

  useEffect(() => {
    useCommandPaletteStore.getState().setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

  const userName = user?.display_name ?? user?.email ?? "Kullanıcı";
  const userInitials = (userName[0] ?? "U").toUpperCase();

  return (
    <ThemeProvider>
      <div data-testid="aurora-user-layout">
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />
        <CockpitShell
          rail={AURORA_USER_RAIL}
          groups={groups}
          workspace="ContentHub · Atölye"
          scopeLabel="Yönetim Paneli"
          scopeHref="/admin"
          userName={userName}
          userInitials={userInitials}
        >
          <Outlet />
        </CockpitShell>
      </div>
    </ThemeProvider>
  );
}
