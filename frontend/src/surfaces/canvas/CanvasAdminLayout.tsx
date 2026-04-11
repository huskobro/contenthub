/**
 * CanvasAdminLayout — "Creator Workspace Pro" admin shell (Faz 5).
 *
 * Canvas'ın admin panel karşılığı. Horizon'un icon-rail + collapsible sidebar
 * modeline BAĞIMLI DEĞİLDİR; Canvas'ın kendi workspace diline göre yeniden
 * tasarlanmıştır.
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ Workspace header (brand · breadcrumb · komut · bildirim · panel sw) │
 *   ├──────────┬──────────────────────────────────────────────────────────┤
 *   │ Sidebar  │ Route outlet (admin pages)                                │
 *   │ (zone-   │                                                           │
 *   │ gruplu   │                                                           │
 *   │ workspace│                                                           │
 *   │ nav)     │                                                           │
 *   └──────────┴──────────────────────────────────────────────────────────┘
 *
 * Tasarım notları:
 *   - 240 px sabit genişlik sol kenarda, zone başlıkları uppercase-mono.
 *   - Aktif öğe sol border-accent + brand-50 zemin.
 *   - Header'da tek satır workspace-breadcrumb + komut palet tetikleyici +
 *     bildirim zili + Kullanıcı Paneli çıkış butonu.
 *   - Admin renk dilini biraz daha "yönetsel" yapmak için hero chip'te
 *     `ADMIN · CANVAS` etiketi kullanılır.
 *
 * Contract preservation:
 *   - ThemeProvider / ToastContainer / CommandPalette / NotificationCenter /
 *     KeyboardShortcutsHelp — tüm shared infra.
 *   - useGlobalSSE, useNotifications({ mode: "admin" }).
 *   - buildAdminNavigationCommands + buildAdminActionCommands + contextual.
 *   - useAdminVisibilityMap + filterHorizonAdminGroups — visibility /
 *     module toggle kurallarını aynen uygular.
 *   - Page-level override mapping Surface kayıt sistemine bırakılmıştır.
 */

import { useEffect, useMemo } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { ToastContainer } from "../../components/design-system/Toast";
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
  buildAdminNavigationCommands,
  buildAdminActionCommands,
} from "../../commands/adminCommands";
import { buildContextualCommands } from "../../commands/contextualCommands";
import {
  useAdminVisibilityMap,
  filterHorizonAdminGroups,
} from "../../app/layouts/useLayoutNavigation";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import type { HorizonNavGroup } from "../../components/layout/HorizonSidebar";
import { CanvasHeaderUserSwitcher } from "../../components/layout/UserSwitcher";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Canvas admin zone model — horizon admin grouplarını üç workspace "zone"una
// yeniden haritalar. Amaç: flat liste yerine workspace dilinde "nereye
// odaklanıyorum" yapısı (Operasyon / İçerik / Sistem).
// Tüm görünürlük + module toggle kuralları horizon grupları üzerinden
// uygulanır, burada yalnızca sunum yeniden gruplanır.
// ---------------------------------------------------------------------------

interface CanvasAdminZone {
  id: string;
  label: string;
  /** Bu zone'a dahil edilen horizon grup id'leri. */
  groupIds: string[];
}

const CANVAS_ADMIN_ZONES: CanvasAdminZone[] = [
  {
    id: "operations",
    label: "Operasyon",
    groupIds: ["overview", "system", "publish"],
  },
  {
    id: "content",
    label: "İçerik & Haber",
    groupIds: ["content", "news", "engagement"],
  },
  {
    id: "insights",
    label: "Analiz & Görünüm",
    groupIds: ["analytics", "appearance"],
  },
];

interface CanvasAdminZoneRendered {
  id: string;
  label: string;
  groups: HorizonNavGroup[];
}

function buildRenderedZones(
  groups: HorizonNavGroup[],
): CanvasAdminZoneRendered[] {
  const byId = new Map<string, HorizonNavGroup>();
  for (const g of groups) byId.set(g.id, g);

  const rendered: CanvasAdminZoneRendered[] = [];
  const usedGroupIds = new Set<string>();

  for (const zone of CANVAS_ADMIN_ZONES) {
    const included = zone.groupIds
      .map((gid) => {
        const grp = byId.get(gid);
        if (grp) usedGroupIds.add(gid);
        return grp;
      })
      .filter((g): g is HorizonNavGroup => !!g && g.items.length > 0);
    if (included.length > 0) {
      rendered.push({ id: zone.id, label: zone.label, groups: included });
    }
  }

  // Diğer zone map'ine düşmeyen gruplar varsa "Diğer" adıyla eklenir.
  // Bu, yeni bir horizon grubu eklendiğinde sidebar'dan kaybolmasını önler.
  const leftovers = groups.filter(
    (g) => !usedGroupIds.has(g.id) && g.items.length > 0,
  );
  if (leftovers.length > 0) {
    rendered.push({ id: "other", label: "Diğer", groups: leftovers });
  }

  return rendered;
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function useAdminBreadcrumb(): string {
  const location = useLocation();
  const path = location.pathname;
  if (path === "/admin" || path === "/admin/") return "yönetim / genel bakış";
  if (path.startsWith("/admin/settings")) return "sistem / ayarlar";
  if (path.startsWith("/admin/visibility")) return "sistem / görünürlük";
  if (path.startsWith("/admin/wizard-settings")) return "sistem / wizard ayarları";
  if (path.startsWith("/admin/jobs")) return "operasyon / işler";
  if (path.startsWith("/admin/audit-logs")) return "operasyon / audit log";
  if (path.startsWith("/admin/modules")) return "sistem / modüller";
  if (path.startsWith("/admin/providers")) return "sistem / sağlayıcılar";
  if (path.startsWith("/admin/prompts")) return "sistem / prompt yönetimi";
  if (path.startsWith("/admin/library")) return "içerik / kütüphane";
  if (path.startsWith("/admin/assets")) return "içerik / varlıklar";
  if (path.startsWith("/admin/standard-videos")) return "içerik / standart video";
  if (path.startsWith("/admin/templates")) return "içerik / şablonlar";
  if (path.startsWith("/admin/style-blueprints")) return "içerik / stil şablonları";
  if (path.startsWith("/admin/template-style-links"))
    return "içerik / şablon-stil bağlantıları";
  if (path.startsWith("/admin/publish")) return "yayın / merkez";
  if (path.startsWith("/admin/comments")) return "etkileşim / yorumlar";
  if (path.startsWith("/admin/playlists")) return "etkileşim / playlistler";
  if (path.startsWith("/admin/posts")) return "etkileşim / gönderiler";
  if (path.startsWith("/admin/analytics/youtube")) return "analiz / youtube";
  if (path.startsWith("/admin/analytics/channel-performance"))
    return "analiz / kanal performansı";
  if (path.startsWith("/admin/analytics")) return "analiz / özet";
  if (path.startsWith("/admin/sources")) return "haber / kaynaklar";
  if (path.startsWith("/admin/source-scans")) return "haber / kaynak taramaları";
  if (path.startsWith("/admin/news-bulletins")) return "haber / bültenler";
  if (path.startsWith("/admin/news-items")) return "haber / öğeler";
  if (path.startsWith("/admin/used-news")) return "haber / kullanılan";
  if (path.startsWith("/admin/users")) return "sistem / kullanıcılar";
  if (path.startsWith("/admin/themes")) return "görünüm / tema yönetimi";
  return "yönetim paneli";
}

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------

export function CanvasAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  // authUser is intentionally not read here — CanvasHeaderUserSwitcher
  // pulls active user via useActiveUser() directly.

  // Shared admin infra
  useCommandPaletteShortcut();
  useGlobalSSE();
  useNotifications({ mode: "admin" });

  // Visibility + module-toggle filtered groups
  const visibilityMap = useAdminVisibilityMap();
  const { enabledMap } = useEnabledModules();
  const groups = useMemo(
    () => filterHorizonAdminGroups(visibilityMap, enabledMap),
    [visibilityMap, enabledMap],
  );
  const zones = useMemo(() => buildRenderedZones(groups), [groups]);

  // Track route inside palette context.
  useEffect(() => {
    useCommandPaletteStore
      .getState()
      .setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

  // Register admin commands (nav + action + contextual).
  useEffect(() => {
    const navCmds = buildAdminNavigationCommands(navigate);
    const actionCmds = buildAdminActionCommands(navigate);
    const ctxCmds = buildContextualCommands(navigate);
    const allCmds = [...navCmds, ...actionCmds, ...ctxCmds];
    useCommandPaletteStore.getState().registerCommands(allCmds);
    return () => {
      useCommandPaletteStore
        .getState()
        .unregisterCommands(allCmds.map((c) => c.id));
    };
  }, [navigate]);

  // Cmd/Ctrl+Shift+U — kullanıcı paneline hızlı geçiş.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        e.stopPropagation();
        navigate("/user");
      }
    }
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true });
  }, [navigate]);

  const breadcrumb = useAdminBreadcrumb();

  return (
    <ThemeProvider>
      <div
        className="flex flex-col min-h-screen bg-surface-page"
        data-testid="canvas-admin-layout"
        data-surface="canvas"
      >
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        {/* Workspace header ------------------------------------------------- */}
        <header
          className={cn(
            "relative z-30 flex items-center gap-4 px-6 py-3 border-b border-border-subtle",
            "bg-surface-card",
          )}
          data-testid="canvas-admin-header"
        >
          <div
            className="text-xs font-semibold uppercase tracking-wider text-brand-600"
            data-testid="canvas-admin-brand"
          >
            Canvas · Admin
          </div>
          <div
            className="text-xs text-neutral-500 font-mono"
            data-testid="canvas-admin-breadcrumb"
          >
            {breadcrumb}
          </div>
          <div className="flex-1" />

          <button
            type="button"
            onClick={() => useCommandPaletteStore.getState().open()}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1 text-xs text-neutral-500",
              "bg-surface-inset border border-border-subtle rounded-md",
              "hover:border-brand-400 transition-colors duration-fast cursor-pointer",
            )}
            data-testid="canvas-admin-command-trigger"
            title="Komut Paleti (⌘K)"
          >
            <span>Komut ara</span>
            <kbd className="text-[10px] font-mono bg-neutral-100 px-1 rounded border border-border-subtle text-neutral-500">
              ⌘K
            </kbd>
          </button>

          <NotificationBell />

          <CanvasHeaderUserSwitcher />

          <div className="w-px h-6 bg-border-subtle mx-1" />

          <button
            type="button"
            onClick={() => navigate("/user")}
            title="Kullanıcı Paneli (Cmd+Shift+U)"
            aria-label="Kullanıcı Paneli"
            data-testid="canvas-admin-panel-switch"
            data-panel-switch="canvas"
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md",
              "border border-border bg-transparent text-neutral-600",
              "hover:bg-neutral-50 hover:border-brand-400 hover:text-neutral-800",
              "transition-colors duration-fast",
            )}
          >
            Kullanıcı Paneli
          </button>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Workspace sidebar ---------------------------------------------- */}
          <nav
            className={cn(
              "w-[240px] shrink-0 border-r border-border-subtle bg-surface-card",
              "overflow-y-auto",
            )}
            role="navigation"
            aria-label="Canvas admin workspace sidebar"
            data-testid="canvas-admin-sidebar"
          >
            <div className="py-4">
              {zones.length === 0 ? (
                <p className="px-4 text-xs text-neutral-400">
                  Görünür öğe yok.
                </p>
              ) : null}
              {zones.map((zone) => (
                <div key={zone.id} className="mb-5">
                  <div
                    className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400"
                    data-testid={`canvas-admin-zone-${zone.id}`}
                  >
                    {zone.label}
                  </div>
                  {zone.groups.map((group) => (
                    <div key={group.id} className="mb-2">
                      <div className="px-4 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        {group.label}
                      </div>
                      <ul className="list-none m-0 p-0">
                        {group.items.map((item) => (
                          <li key={item.to}>
                            <NavLink
                              to={item.to}
                              end={item.to === "/admin"}
                              data-testid={`canvas-admin-link-${item.to.replace(/\//g, "-")}`}
                              className={({ isActive }) =>
                                cn(
                                  "flex items-center gap-2 px-4 py-1.5 text-sm no-underline",
                                  "border-l-2 transition-colors duration-fast",
                                  isActive
                                    ? "bg-brand-50 border-l-brand-600 text-brand-700 font-medium"
                                    : "border-l-transparent text-neutral-700 hover:bg-neutral-50",
                                )
                              }
                            >
                              <span className="flex-1 truncate">
                                {item.label}
                              </span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </nav>

          {/* Workspace content ---------------------------------------------- */}
          <main
            className="flex-1 overflow-y-auto"
            style={{ padding: "var(--ch-page-padding)" }}
            data-testid="canvas-admin-content"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
