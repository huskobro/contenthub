/**
 * AuroraAdminLayout — admin panel için Aurora Dusk Cockpit Shell.
 *
 * 6 rail slot'u, her biri çoklu prefix listesiyle. Tüm `/admin/*` rotaları
 * mantıklı bir slot'a bağlanır; rail'de unutulan rota → "Genel Bakış" tek
 * tab açılma bug'ı engellenir.
 *
 *   ops       — /admin (Genel Bakış, Bugün)
 *   content   — /admin/library, /admin/assets, /admin/standard-videos,
 *               /admin/news-bulletins, /admin/templates,
 *               /admin/style-blueprints, /admin/template-style-links,
 *               /admin/used-news, /admin/channels, /admin/projects
 *   news      — /admin/sources, /admin/source-scans, /admin/news-items
 *   publish   — /admin/publish, /admin/calendar, /admin/comments,
 *               /admin/playlists, /admin/posts (yayın + etkileşim)
 *   insights  — /admin/analytics
 *   system    — /admin/settings, /admin/visibility, /admin/wizard-settings,
 *               /admin/jobs, /admin/audit-logs, /admin/modules,
 *               /admin/providers, /admin/prompts, /admin/users,
 *               /admin/themes, /admin/notifications, /admin/connections,
 *               /admin/automation, /admin/inbox, /admin/wizard
 *
 * Override edilmemiş rotalar doğrudan legacy sayfasına düşer (router
 * değişmiyor; sadece layout sarmalayıcı Aurora'nın). Override'lar ise
 * `register.tsx` içinde `pageOverrides` ile bağlanır.
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
import {
  buildAdminNavigationCommands,
  buildAdminActionCommands,
} from "../../commands/adminCommands";
import { buildContextualCommands } from "../../commands/contextualCommands";
import {
  useAdminVisibilityMap,
  filterHorizonAdminGroups,
} from "../../app/layouts/useLayoutNavigation";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import { CockpitShell, type AuroraRailSlot } from "./CockpitShell";

const AURORA_ADMIN_RAIL: AuroraRailSlot[] = [
  {
    id: "ops",
    label: "Operasyonlar",
    icon: "layout-dashboard",
    matchPrefixes: ["/admin"],
    homeRoute: "/admin",
    groupIds: ["today"],
  },
  {
    id: "content",
    label: "Üretim",
    icon: "film",
    matchPrefixes: [
      "/admin/library",
      "/admin/assets",
      "/admin/standard-videos",
      "/admin/news-bulletins",
      "/admin/templates",
      "/admin/style-blueprints",
      "/admin/template-style-links",
      "/admin/used-news",
      // Aurora-native admin surfaces for channels + projects (incl. BC/AC).
      "/admin/channels",
      "/admin/projects",
    ],
    homeRoute: "/admin/library",
    groupIds: ["content"],
  },
  {
    id: "news",
    label: "Haber",
    icon: "globe",
    matchPrefixes: ["/admin/sources", "/admin/source-scans", "/admin/news-items"],
    homeRoute: "/admin/sources",
    groupIds: ["news"],
  },
  {
    id: "publish",
    label: "Yayın",
    icon: "send",
    matchPrefixes: [
      "/admin/publish",
      "/admin/calendar",
      "/admin/comments",
      "/admin/playlists",
      "/admin/posts",
    ],
    homeRoute: "/admin/publish",
    groupIds: ["publish", "engagement"],
  },
  {
    id: "insights",
    label: "Analitik",
    icon: "bar-chart",
    matchPrefixes: ["/admin/analytics"],
    homeRoute: "/admin/analytics",
    groupIds: ["analytics"],
  },
  {
    id: "system",
    label: "Sistem",
    icon: "settings",
    matchPrefixes: [
      "/admin/settings",
      "/admin/visibility",
      "/admin/wizard-settings",
      "/admin/jobs",
      "/admin/audit-logs",
      "/admin/modules",
      "/admin/providers",
      "/admin/prompts",
      "/admin/users",
      "/admin/themes",
      "/admin/notifications",
      "/admin/connections",
      "/admin/automation",
      "/admin/inbox",
      "/admin/wizard",
    ],
    homeRoute: "/admin/settings",
    groupIds: ["system", "scope", "appearance"],
  },
];

export function AuroraAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const visibilityMap = useAdminVisibilityMap();
  const { enabledMap } = useEnabledModules();
  const groups = useMemo(
    () => filterHorizonAdminGroups(visibilityMap, enabledMap),
    [visibilityMap, enabledMap],
  );

  // Standart admin altyapısı
  useCommandPaletteShortcut();
  useGlobalSSE();
  useNotifications({ mode: "admin" });

  useEffect(() => {
    useCommandPaletteStore.getState().setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    const navCmds = buildAdminNavigationCommands(navigate);
    const actionCmds = buildAdminActionCommands(navigate);
    const ctxCmds = buildContextualCommands(navigate);
    const all = [...navCmds, ...actionCmds, ...ctxCmds];
    useCommandPaletteStore.getState().registerCommands(all);
    return () => {
      useCommandPaletteStore.getState().unregisterCommands(all.map((c) => c.id));
    };
  }, [navigate]);

  const userName = user?.display_name ?? user?.email ?? "Admin";
  const userInitials = (userName[0] ?? "A").toUpperCase();

  return (
    <ThemeProvider>
      <div data-testid="aurora-admin-layout">
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />
        <CockpitShell
          rail={AURORA_ADMIN_RAIL}
          groups={groups}
          workspace="ContentHub · Admin"
          scopeLabel="Kullanıcı Paneli"
          scopeHref="/user"
          userName={userName}
          userInitials={userInitials}
        >
          <Outlet />
        </CockpitShell>
      </div>
    </ThemeProvider>
  );
}
