/**
 * CanvasUserLayout — "Creator Workspace Pro" user shell (Faz 3)
 *
 * The first visibly-new user-facing shell in ContentHub. Canvas presents the
 * content production experience as a project-centric workspace:
 *
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ Workspace header  (breadcrumb + create CTA + notification bell)    │
 *   ├─────────┬──────────────────────────────────────────────────────────┤
 *   │ Sidebar │ Route outlet (canvas page overrides or legacy fallback)  │
 *   │ (projects│                                                         │
 *   │  first) │                                                          │
 *   └─────────┴──────────────────────────────────────────────────────────┘
 *
 * Contract preservation:
 *   - Mounts <ThemeProvider> so CSS variable tokens still apply.
 *   - Reuses the same infra hooks as UserLayout:
 *       • useCommandPaletteShortcut (Cmd+K)
 *       • useGlobalSSE
 *       • useNotifications({ mode: "user" })
 *   - Reuses the same command builders (buildUserNavigationCommands /
 *     buildUserActionCommands) so the palette still works identically.
 *   - Renders the same <Outlet /> the legacy UserLayout rendered, so routes
 *     keep working unchanged. Page-level visual change comes from
 *     `pageOverrides` on the Canvas surface, not from route surgery.
 *   - NO admin logic whatsoever. Canvas is user-scope only.
 *
 * Legacy fallback:
 *   - If `ui.surface.canvas.enabled` is off or the surface resolver picks
 *     legacy for any reason, DynamicUserLayout simply renders UserLayout and
 *     this component never mounts.
 *
 * Visual identity:
 *   - Spacious, card-forward chrome.
 *   - `data-surface="canvas"` / `data-testid="canvas-user-layout"` for tests.
 *   - Distinctive workspace header + project-oriented sidebar so the shift
 *     from legacy is immediately obvious to the user.
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
  buildUserNavigationCommands,
  buildUserActionCommands,
} from "../../commands/userCommands";
import { useAuthStore } from "../../stores/authStore";
import { useContentProjects } from "../../hooks/useContentProjects";
import { CanvasHeaderUserSwitcher } from "../../components/layout/UserSwitcher";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Sidebar model — workspace-oriented, not a flat list of routes.
// Canvas reorganizes the user navigation into three zones:
//   1. Workspace (dashboard / my projects / create)
//   2. Distribution (publish / comments / playlists / posts)
//   3. Insights & settings (analytics / settings)
// Items that are currently overridden by canvas get a small "canvas" pill.
// ---------------------------------------------------------------------------

interface CanvasNavItem {
  label: string;
  to: string;
  /** Item is rendered with the canvas override (visual cue only). */
  canvasOverride?: boolean;
  /** Exact-match for NavLink active state (otherwise prefix-match). */
  end?: boolean;
}

interface CanvasNavZone {
  id: string;
  label: string;
  items: CanvasNavItem[];
}

const CANVAS_NAV: CanvasNavZone[] = [
  {
    id: "workspace",
    label: "Çalışma Alanı",
    items: [
      { label: "Anasayfa", to: "/user", canvasOverride: true, end: true },
      { label: "Projelerim", to: "/user/projects", canvasOverride: true, end: true },
      { label: "Takvim", to: "/user/calendar", canvasOverride: true },
      { label: "Video Oluştur", to: "/user/create/video" },
      { label: "Bülten Oluştur", to: "/user/create/bulletin" },
    ],
  },
  {
    id: "distribution",
    label: "Dağıtım",
    items: [
      { label: "Kanallarım", to: "/user/channels", canvasOverride: true, end: true },
      { label: "İçerik", to: "/user/content" },
      { label: "Yayın", to: "/user/publish", canvasOverride: true },
      { label: "Bağlantılar", to: "/user/connections", canvasOverride: true },
      { label: "Yorumlar", to: "/user/comments" },
      { label: "Playlist'lerim", to: "/user/playlists" },
      { label: "Gönderilerim", to: "/user/posts" },
    ],
  },
  {
    id: "insights",
    label: "Analiz ve Ayarlar",
    items: [
      { label: "Analiz", to: "/user/analytics", canvasOverride: true, end: true },
      { label: "Kanal Performansım", to: "/user/analytics/channels" },
      { label: "Ayarlarım", to: "/user/settings" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a short workspace breadcrumb from the current pathname. */
function useWorkspaceBreadcrumb(): string {
  const location = useLocation();
  const path = location.pathname;
  if (path === "/user" || path === "/user/") return "çalışma alanı / anasayfa";
  if (path.startsWith("/user/projects")) return "çalışma alanı / projelerim";
  if (path.startsWith("/user/calendar")) return "çalışma alanı / takvim";
  if (path.startsWith("/user/create/video")) return "çalışma alanı / video oluştur";
  if (path.startsWith("/user/create/bulletin")) return "çalışma alanı / bülten oluştur";
  // Channel detail → "dağıtım / kanal stüdyosu"; channels list → "dağıtım / kanallarım"
  if (/^\/user\/channels\/[^/]+$/.test(path))
    return "dağıtım / kanal stüdyosu";
  if (path.startsWith("/user/channels")) return "dağıtım / kanallarım";
  if (path.startsWith("/user/publish")) return "dağıtım / yayın";
  if (path.startsWith("/user/connections")) return "dağıtım / bağlantılar";
  if (path.startsWith("/user/content")) return "dağıtım / içerik";
  if (path.startsWith("/user/comments")) return "dağıtım / yorumlar";
  if (path.startsWith("/user/playlists")) return "dağıtım / playlistler";
  if (path.startsWith("/user/posts")) return "dağıtım / gönderilerim";
  if (path.startsWith("/user/analytics/channels"))
    return "analiz / kanal performansım";
  if (path.startsWith("/user/analytics")) return "analiz / özet";
  if (path.startsWith("/user/settings")) return "analiz / ayarlarım";
  return "çalışma alanı";
}

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------

export function CanvasUserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id;

  // Register command palette shortcut (Cmd+K / Ctrl+K)
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

  // Register user commands on mount — identical set to legacy UserLayout,
  // so Cmd+K keeps working exactly as before.
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

  // Workspace header — "pinned" project count (workspace feel). We hit the
  // same hook the Canvas dashboard uses, so React Query de-dupes the request.
  const { data: projects } = useContentProjects(
    userId ? { user_id: userId, limit: 50 } : undefined,
  );
  const projectCount = (projects ?? []).length;

  const breadcrumb = useWorkspaceBreadcrumb();
  const isAdmin = authUser?.role === "admin";

  // Cmd/Ctrl+Shift+A: admin panele hizli gecis (sadece admin rolu icin).
  // Canvas'ta sag ustteki "Yonetim Paneli" butonunun klavye kisayoludur.
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

  const sidebarZones = useMemo(() => CANVAS_NAV, []);

  return (
    <ThemeProvider>
      <div
        className="flex flex-col min-h-screen bg-surface-page"
        data-testid="canvas-user-layout"
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
          data-testid="canvas-workspace-header"
        >
          <div
            className="text-xs font-semibold uppercase tracking-wider text-brand-600"
            data-testid="canvas-brand"
          >
            Canvas Workspace
          </div>
          <div
            className="text-xs text-neutral-500 font-mono"
            data-testid="canvas-breadcrumb"
          >
            {breadcrumb}
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => navigate("/user/create/video")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md",
              "bg-brand-600 text-white hover:bg-brand-700",
              "transition-colors duration-fast",
            )}
            data-testid="canvas-header-create-video"
          >
            + Video
          </button>
          <button
            type="button"
            onClick={() => navigate("/user/create/bulletin")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md",
              "border border-border-subtle bg-transparent",
              "hover:bg-brand-50 hover:border-brand-400",
              "transition-colors duration-fast",
            )}
            data-testid="canvas-header-create-bulletin"
          >
            + Bülten
          </button>
          <div className="w-px h-6 bg-border-subtle mx-1" />
          <NotificationBell />
          <CanvasHeaderUserSwitcher />
          <div
            className="text-[10px] text-neutral-500 font-mono"
            data-testid="canvas-header-project-count"
          >
            {projectCount} proje
          </div>
          {/* Faz 4D: panel switch — Canvas user shell'inden yonetim paneline
              gecis. Daha once bu butonun Canvas'ta hic render edilmedigi
              dogrulandi; kullanici admin'e donemiyordu. Basit link butonu,
              yeni nav sistemi degil.
              2026-04-11: role guard eklendi — sadece admin rolu olan
              kullanicilar gorur; normal user'lar icin giziler (AuthGuard
              zaten non-admin'i /admin'e sokmaz, ama UX icin butonu da
              gostermiyoruz). */}
          {isAdmin && (
            <>
              <div className="w-px h-6 bg-border-subtle mx-1" />
              {/* F48 fix: panel switch copy standardizasyonu — "Yönetim Paneli"
                  tüm surface'lerde aynı etiket. */}
              <button
                type="button"
                onClick={() => navigate("/admin")}
                title="Yönetim Paneli (Cmd+Shift+A)"
                aria-label="Yönetim Paneli"
                data-testid="canvas-panel-switch"
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md",
                  "border border-border bg-transparent text-neutral-600",
                  "hover:bg-neutral-50 hover:border-brand-400 hover:text-neutral-800",
                  "transition-colors duration-fast",
                )}
              >
                Yönetim Paneli
              </button>
            </>
          )}
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Workspace sidebar ---------------------------------------------- */}
          <nav
            className={cn(
              "w-[232px] shrink-0 border-r border-border-subtle bg-surface-card",
              "overflow-y-auto",
            )}
            role="navigation"
            aria-label="Canvas workspace sidebar"
            data-testid="canvas-sidebar"
          >
            <div className="py-4">
              {sidebarZones.map((zone) => (
                <div key={zone.id} className="mb-5">
                  <div
                    className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400"
                    data-testid={`canvas-sidebar-zone-${zone.id}`}
                  >
                    {zone.label}
                  </div>
                  <ul className="list-none m-0 p-0">
                    {zone.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          data-testid={`canvas-sidebar-link-${item.to.replace(/\//g, "-")}`}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 px-4 py-2 text-sm no-underline",
                              "border-l-2 transition-colors duration-fast",
                              isActive
                                ? "bg-brand-50 border-l-brand-600 text-brand-700 font-medium"
                                : "border-l-transparent text-neutral-700 hover:bg-neutral-50",
                            )
                          }
                        >
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.canvasOverride ? (
                            <span
                              className="text-[9px] font-mono uppercase text-brand-500 border border-brand-200 rounded px-1 py-[1px]"
                              title="Canvas override"
                            >
                              canvas
                            </span>
                          ) : null}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* Workspace content ---------------------------------------------- */}
          <main
            className="flex-1 overflow-y-auto"
            style={{ padding: "var(--ch-page-padding)" }}
            data-testid="canvas-content"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
