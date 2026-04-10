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
    label: "Workspace",
    items: [
      { label: "Anasayfa", to: "/user", canvasOverride: true, end: true },
      { label: "Projelerim", to: "/user/projects", canvasOverride: true, end: true },
      { label: "Video Olustur", to: "/user/create/video" },
      { label: "Bulten Olustur", to: "/user/create/bulletin" },
    ],
  },
  {
    id: "distribution",
    label: "Dagitim",
    items: [
      { label: "Kanallarim", to: "/user/channels" },
      { label: "Icerik", to: "/user/content" },
      { label: "Yayin", to: "/user/publish" },
      { label: "Yorumlar", to: "/user/comments" },
      { label: "Playlist'lerim", to: "/user/playlists" },
      { label: "Gonderilerim", to: "/user/posts" },
    ],
  },
  {
    id: "insights",
    label: "Analiz & Ayarlar",
    items: [
      { label: "Kanal Performansim", to: "/user/analytics/channels" },
      { label: "Ayarlarim", to: "/user/settings" },
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
  if (path === "/user" || path === "/user/") return "workspace / anasayfa";
  if (path.startsWith("/user/projects")) return "workspace / projelerim";
  if (path.startsWith("/user/create/video")) return "workspace / video olustur";
  if (path.startsWith("/user/create/bulletin")) return "workspace / bulten olustur";
  if (path.startsWith("/user/channels")) return "dagitim / kanallarim";
  if (path.startsWith("/user/publish")) return "dagitim / yayin";
  if (path.startsWith("/user/content")) return "dagitim / icerik";
  if (path.startsWith("/user/comments")) return "dagitim / yorumlar";
  if (path.startsWith("/user/playlists")) return "dagitim / playlistler";
  if (path.startsWith("/user/posts")) return "dagitim / gonderilerim";
  if (path.startsWith("/user/analytics")) return "analiz / kanal performansim";
  if (path.startsWith("/user/settings")) return "analiz / ayarlarim";
  return "workspace";
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
  const displayName = authUser?.display_name ?? "Kullanici";

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
            "flex items-center gap-4 px-6 py-3 border-b border-border-subtle",
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
            + Bulten
          </button>
          <div className="w-px h-6 bg-border-subtle mx-1" />
          <NotificationBell />
          <div
            className="text-xs text-neutral-600"
            data-testid="canvas-header-user"
          >
            {displayName}
            <span className="ml-2 text-neutral-400">&middot;</span>
            <span className="ml-2 text-neutral-500">{projectCount} proje</span>
          </div>
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
