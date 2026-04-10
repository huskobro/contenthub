/**
 * AtriumUserLayout — "Premium Media OS" user shell (Faz 4).
 *
 * Atrium is the second visibly-new user-facing shell in ContentHub (after
 * Canvas). Where Canvas feels like a creator workspace (sidebar + project
 * rail), Atrium feels like a premium media studio / editorial magazine:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Editorial marquee — brand rail + user chip + notification + CTAs │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ Horizontal top-nav strip (Showcase · Projeler · Dagitim · Analiz │
 *   │  · Ayarlar) — no sidebar, editorial column underneath            │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ Outlet: atrium page override OR existing user-scope fallback     │
 *   │ (legacy pages still render if atrium has no override for them)   │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Contract preservation:
 *   - Mounts <ThemeProvider> so the existing CSS variable tokens apply.
 *   - Reuses the same infra hooks as the other shells:
 *       • useCommandPaletteShortcut (Cmd+K)
 *       • useGlobalSSE
 *       • useNotifications({ mode: "user" })
 *   - Reuses the same command builders so Cmd+K keeps working identically.
 *   - Renders <Outlet /> — pages are swapped via surface page overrides,
 *     not via route surgery.
 *   - NO admin logic whatsoever. Atrium is user-scope only.
 *
 * Legacy fallback:
 *   - If `ui.surface.atrium.enabled` is off, or the resolver picks a
 *     different surface (canvas/legacy) for any reason, DynamicUserLayout
 *     simply renders the other layout and this component never mounts.
 *
 * Visual identity:
 *   - Dark editorial marquee + light editorial column.
 *   - Wide hero bands, large typographic moments, showcase columns.
 *   - `data-surface="atrium"` + `data-testid="atrium-user-layout"` for tests.
 */

import { useEffect, useMemo } from "react";
import {
  Outlet,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
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
// Top-nav model — horizontal editorial strip (no sidebar).
// Atrium keeps the same user routes but reorganizes them into five editorial
// "channels" that match the premium / showcase tone.
// ---------------------------------------------------------------------------

interface AtriumNavItem {
  label: string;
  to: string;
  end?: boolean;
  /** Item currently has an atrium override (visual cue only). */
  atriumOverride?: boolean;
}

const ATRIUM_NAV: AtriumNavItem[] = [
  { label: "Showcase", to: "/user", end: true, atriumOverride: true },
  { label: "Projeler", to: "/user/projects", end: true, atriumOverride: true },
  { label: "Takvim", to: "/user/calendar" },
  { label: "Dagitim", to: "/user/publish" },
  { label: "Kanallar", to: "/user/channels", end: true },
  { label: "Analiz", to: "/user/analytics", end: true },
  { label: "Ayarlar", to: "/user/settings" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive an editorial tagline for the current route. */
function useEditorialMoment(): { kicker: string; title: string } {
  const location = useLocation();
  const path = location.pathname;
  if (path === "/user" || path === "/user/")
    return {
      kicker: "SHOWCASE",
      title: "Bugunun one cikan yapimlari",
    };
  if (/^\/user\/projects\/[^/]+/.test(path))
    return {
      kicker: "EDITORIAL",
      title: "Proje stuyosu",
    };
  if (path.startsWith("/user/projects"))
    return {
      kicker: "PORTFOLIO",
      title: "Tum yapimlarin",
    };
  if (path.startsWith("/user/calendar"))
    return {
      kicker: "PROGRAM",
      title: "Yayin akisi",
    };
  if (path.startsWith("/user/publish"))
    return {
      kicker: "DISTRIBUTION",
      title: "Dagitim atolyesi",
    };
  if (path.startsWith("/user/channels"))
    return {
      kicker: "BRANDS",
      title: "Kanal dunyalarin",
    };
  if (path.startsWith("/user/analytics"))
    return {
      kicker: "INSIGHTS",
      title: "Performans editoryali",
    };
  if (path.startsWith("/user/settings"))
    return {
      kicker: "STUDIO",
      title: "Yapim ayarlari",
    };
  return { kicker: "ATRIUM", title: "Premium media OS" };
}

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------

export function AtriumUserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id;

  // Register command palette shortcut (Cmd+K / Ctrl+K) — same as canvas/legacy.
  useCommandPaletteShortcut();
  useGlobalSSE();
  useNotifications({ mode: "user" });

  // Update command palette context on route change.
  useEffect(() => {
    useCommandPaletteStore
      .getState()
      .setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

  // Register user commands — same build functions as the other shells, so
  // Cmd+K keeps working identically across surfaces.
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

  // Project count for the marquee chip (same React Query key de-duped).
  const { data: projects } = useContentProjects(
    userId ? { user_id: userId, limit: 50 } : undefined,
  );
  const projectCount = (projects ?? []).length;

  const displayName = authUser?.display_name ?? "Editor";
  const moment = useEditorialMoment();
  const navItems = useMemo(() => ATRIUM_NAV, []);

  return (
    <ThemeProvider>
      <div
        className="flex flex-col min-h-screen bg-neutral-50"
        data-testid="atrium-user-layout"
        data-surface="atrium"
      >
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        {/* Editorial marquee ----------------------------------------------- */}
        <header
          className={cn(
            "relative overflow-hidden",
            "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900",
            "text-neutral-50 border-b border-neutral-900",
          )}
          data-testid="atrium-marquee"
        >
          {/* Decorative brand gradient wash */}
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 pointer-events-none opacity-40",
              "bg-[radial-gradient(circle_at_15%_0%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(circle_at_85%_120%,rgba(236,72,153,0.25),transparent_55%)]",
            )}
          />
          <div className="relative flex items-center gap-6 px-8 py-4">
            <div
              className="flex items-center gap-3 shrink-0"
              data-testid="atrium-brand"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-md flex items-center justify-center",
                  "bg-gradient-to-br from-indigo-400 via-fuchsia-500 to-amber-400",
                  "text-neutral-900 font-black text-lg shadow-lg",
                )}
              >
                A
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Atrium
                </span>
                <span className="text-sm font-semibold text-neutral-100">
                  Premium Media OS
                </span>
              </div>
            </div>

            <div
              className="hidden md:flex flex-col leading-tight min-w-0"
              data-testid="atrium-marquee-moment"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                {moment.kicker}
              </span>
              <span className="text-sm text-neutral-200 truncate">
                {moment.title}
              </span>
            </div>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => navigate("/user/create/video")}
              className={cn(
                "hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full",
                "text-xs font-semibold",
                "bg-white text-neutral-900 hover:bg-neutral-200 transition-colors",
              )}
              data-testid="atrium-marquee-create-video"
            >
              + Video
            </button>
            <button
              type="button"
              onClick={() => navigate("/user/create/bulletin")}
              className={cn(
                "hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full",
                "text-xs font-semibold",
                "border border-neutral-600 text-neutral-100 hover:bg-neutral-800 transition-colors",
              )}
              data-testid="atrium-marquee-create-bulletin"
            >
              + Bulten
            </button>

            <div className="w-px h-7 bg-neutral-700 mx-1" />

            {/* Faz 4D: panel switch — Atrium kullanici shell'inden yonetim
                paneline gecis. Atrium'da daha once panel switch butonu yoktu;
                kullanici admin'e donemiyordu. Premium hisse uyan, koyu
                tema-uyumlu pill buton. */}
            <button
              type="button"
              onClick={() => navigate("/admin")}
              title="Yonetim paneline gecis yapin"
              aria-label="Yonetim paneline gecis yapin"
              data-testid="atrium-panel-switch"
              className={cn(
                "hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full",
                "text-xs font-semibold",
                "border border-neutral-600 text-neutral-100",
                "hover:bg-neutral-800 transition-colors",
              )}
            >
              Yonetim Paneli
            </button>

            <div className="w-px h-7 bg-neutral-700 mx-1" />

            <NotificationBell />

            <div
              className={cn(
                "hidden md:flex items-center gap-2 pl-3 pr-4 py-1 rounded-full",
                "border border-neutral-700 bg-neutral-900/40 text-[11px]",
              )}
              data-testid="atrium-marquee-user"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-neutral-900">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-neutral-100 font-medium truncate max-w-[140px]">
                  {displayName}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-neutral-400">
                  {projectCount} yapim
                </span>
              </div>
            </div>
          </div>

          {/* Editorial top nav strip --------------------------------------- */}
          <nav
            className={cn(
              "relative flex items-end gap-6 px-8 pt-2",
              "border-t border-neutral-800/60",
            )}
            role="navigation"
            aria-label="Atrium editorial navigation"
            data-testid="atrium-topnav"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`atrium-topnav-link-${item.to.replace(/\//g, "-")}`}
                className={({ isActive }) =>
                  cn(
                    "relative pb-3 pt-2 text-xs font-semibold uppercase tracking-[0.14em]",
                    "no-underline transition-colors duration-fast",
                    isActive
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-100",
                  )
                }
              >
                {({ isActive }) => (
                  <span className="flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {item.atriumOverride ? (
                      <span
                        className="text-[8px] font-mono uppercase text-indigo-300 border border-indigo-400/50 rounded px-1 py-[1px]"
                        title="Atrium override"
                      >
                        atrium
                      </span>
                    ) : null}
                    {isActive ? (
                      <span
                        aria-hidden
                        className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300"
                      />
                    ) : null}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* Editorial column -------------------------------------------------- */}
        <main
          className="flex-1 overflow-y-auto"
          data-testid="atrium-content"
        >
          <div
            className="mx-auto max-w-[1360px] px-6 md:px-10 py-8 md:py-10"
            data-testid="atrium-content-inner"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
