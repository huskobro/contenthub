/**
 * AtriumAdminLayout — "Premium Media OS" admin shell (Faz 5).
 *
 * Atrium'ın admin karşılığı. AtriumUserLayout ile aynı görsel dil:
 *   - koyu editorial marquee + gradient washes
 *   - yatay top-nav (sidebar yok)
 *   - editorial moment kicker + baslik
 *   - beyaz/neutral-50 icerik sutunu
 *
 * Ancak bilgi tarafinda admin paneldir:
 *   - useAdminVisibilityMap + filterHorizonAdminGroups
 *   - useNotifications({ mode: "admin" })
 *   - buildAdminNavigationCommands + contextual commands
 *
 * Top-nav 6 editorial "channel" uzerine kurulu. Her kanal horizon admin
 * gruplarindan bir alt-kume besler. Kanal tiklaninca o zone'un ilk gorunur
 * oge'sine goturur. Mega-menu yok; aktif kanal icinde second-level link list
 * main area'nin ustunde editorial bir strip olarak gosterilir.
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
import { useAuthStore } from "../../stores/authStore";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Editorial channels — horizon grubu -> editorial kanal mapping
// ---------------------------------------------------------------------------

interface AtriumAdminChannel {
  id: string;
  label: string;
  kicker: string;
  matchPrefix: string;
  groupIds: string[];
}

const ATRIUM_ADMIN_CHANNELS: AtriumAdminChannel[] = [
  {
    id: "newsroom",
    label: "Haber Odası",
    kicker: "NEWSROOM",
    matchPrefix: "/admin/sources",
    groupIds: ["news"],
  },
  {
    id: "studio",
    label: "Stüdyo",
    kicker: "STUDIO",
    matchPrefix: "/admin/library",
    groupIds: ["content"],
  },
  {
    id: "broadcast",
    label: "Yayın",
    kicker: "BROADCAST",
    matchPrefix: "/admin/publish",
    groupIds: ["publish", "engagement"],
  },
  {
    id: "ops",
    label: "Operasyon",
    kicker: "COMMAND",
    matchPrefix: "/admin/jobs",
    groupIds: ["system"],
  },
  {
    id: "insight",
    label: "İçgörü",
    kicker: "INSIGHT",
    matchPrefix: "/admin/analytics",
    groupIds: ["analytics", "overview"],
  },
  {
    id: "design",
    label: "Stil",
    kicker: "DESIGN",
    matchPrefix: "/admin/themes",
    groupIds: ["appearance"],
  },
];

function pickActiveChannel(pathname: string): AtriumAdminChannel {
  let best: AtriumAdminChannel | null = null;
  let bestLen = -1;
  for (const c of ATRIUM_ADMIN_CHANNELS) {
    if (
      pathname.startsWith(c.matchPrefix) &&
      c.matchPrefix.length > bestLen
    ) {
      best = c;
      bestLen = c.matchPrefix.length;
    }
  }
  return best ?? ATRIUM_ADMIN_CHANNELS[0];
}

function channelGroups(
  channel: AtriumAdminChannel,
  groups: HorizonNavGroup[],
): HorizonNavGroup[] {
  return groups.filter((g) => channel.groupIds.includes(g.id));
}

// ---------------------------------------------------------------------------
// Editorial moment
// ---------------------------------------------------------------------------

function useAdminMoment(channel: AtriumAdminChannel): { kicker: string; title: string } {
  const path = useLocation().pathname;
  if (path === "/admin" || path === "/admin/") {
    return { kicker: "COMMAND", title: "Yönetim özeti" };
  }
  switch (channel.id) {
    case "newsroom":
      return { kicker: "NEWSROOM", title: "Haber kaynağı operasyonu" };
    case "studio":
      return { kicker: "STUDIO", title: "İçerik atölyesi" };
    case "broadcast":
      return { kicker: "BROADCAST", title: "Yayın akışı" };
    case "ops":
      return { kicker: "COMMAND", title: "İş ve iş hattı yönetimi" };
    case "insight":
      return { kicker: "INSIGHT", title: "Performans editoryali" };
    case "design":
      return { kicker: "DESIGN", title: "Stil ve tema yönetimi" };
    default:
      return { kicker: channel.kicker, title: channel.label };
  }
}

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------

export function AtriumAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((s) => s.user);
  const displayName = authUser?.display_name ?? "Editor";

  useCommandPaletteShortcut();
  useGlobalSSE();
  useNotifications({ mode: "admin" });

  const visibilityMap = useAdminVisibilityMap();
  const { enabledMap } = useEnabledModules();
  const groups = useMemo(
    () => filterHorizonAdminGroups(visibilityMap, enabledMap),
    [visibilityMap, enabledMap],
  );

  useEffect(() => {
    useCommandPaletteStore
      .getState()
      .setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

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

  // Cmd/Ctrl+Shift+U — user panel geçişi.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "U" || e.key === "u")
      ) {
        e.preventDefault();
        e.stopPropagation();
        navigate("/user");
      }
    }
    document.addEventListener("keydown", onKey, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKey, { capture: true });
  }, [navigate]);

  const activeChannel = pickActiveChannel(location.pathname);
  const moment = useAdminMoment(activeChannel);
  const activeChannelGroups = useMemo(
    () => channelGroups(activeChannel, groups),
    [activeChannel, groups],
  );

  const navigateToChannel = (channel: AtriumAdminChannel) => {
    const inChannel = channelGroups(channel, groups);
    const target = inChannel[0]?.items?.[0]?.to ?? channel.matchPrefix;
    navigate(target);
  };

  return (
    <ThemeProvider>
      <div
        className="flex flex-col min-h-screen bg-neutral-50"
        data-testid="atrium-admin-layout"
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
          data-testid="atrium-admin-marquee"
        >
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
              data-testid="atrium-admin-brand"
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
                  Atrium · Admin
                </span>
                <span className="text-sm font-semibold text-neutral-100">
                  Premium Media OS
                </span>
              </div>
            </div>

            <div
              className="hidden md:flex flex-col leading-tight min-w-0"
              data-testid="atrium-admin-moment"
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
              onClick={() => useCommandPaletteStore.getState().open()}
              className={cn(
                "hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
                "text-xs font-semibold",
                "border border-neutral-600 text-neutral-100",
                "hover:bg-neutral-800 transition-colors",
              )}
              title="Komut Paleti (⌘K)"
              data-testid="atrium-admin-command-trigger"
            >
              <span>Komut</span>
              <kbd className="text-[10px] font-mono bg-neutral-800 text-neutral-300 px-1 rounded border border-neutral-700">
                ⌘K
              </kbd>
            </button>

            <div className="w-px h-7 bg-neutral-700 mx-1" />

            <NotificationBell />

            <div className="w-px h-7 bg-neutral-700 mx-1" />

            <button
              type="button"
              onClick={() => navigate("/user")}
              title="Kullanıcı Paneli (Cmd+Shift+U)"
              aria-label="Kullanıcı Paneli"
              data-testid="atrium-admin-panel-switch"
              data-panel-switch="atrium"
              className={cn(
                "hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full",
                "text-xs font-semibold",
                "border border-neutral-600 text-neutral-100",
                "hover:bg-neutral-800 transition-colors",
              )}
            >
              Kullanıcı Paneli
            </button>

            <div
              className={cn(
                "hidden md:flex items-center gap-2 pl-3 pr-4 py-1 rounded-full",
                "border border-neutral-700 bg-neutral-900/40 text-[11px]",
              )}
              data-testid="atrium-admin-user"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-neutral-900">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-neutral-100 font-medium truncate max-w-[140px]">
                  {displayName}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-neutral-400">
                  yönetim
                </span>
              </div>
            </div>
          </div>

          {/* Editorial top-nav strip --------------------------------------- */}
          <nav
            className={cn(
              "relative flex items-end gap-6 px-8 pt-2",
              "border-t border-neutral-800/60",
            )}
            role="navigation"
            aria-label="Atrium admin editorial navigation"
            data-testid="atrium-admin-topnav"
          >
            {/* Overview özel olarak NavLink — her zaman görünür */}
            <NavLink
              to="/admin"
              end
              data-testid="atrium-admin-topnav-link-overview"
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
                  <span>Genel</span>
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300"
                    />
                  ) : null}
                </span>
              )}
            </NavLink>
            {ATRIUM_ADMIN_CHANNELS.map((ch) => {
              const chGroups = channelGroups(ch, groups);
              if (chGroups.length === 0) return null;
              const isActive = ch.id === activeChannel.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => navigateToChannel(ch)}
                  data-testid={`atrium-admin-topnav-link-${ch.id}`}
                  className={cn(
                    "relative pb-3 pt-2 text-xs font-semibold uppercase tracking-[0.14em]",
                    "bg-transparent border-none cursor-pointer",
                    "no-underline transition-colors duration-fast",
                    isActive
                      ? "text-white"
                      : "text-neutral-400 hover:text-neutral-100",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{ch.label}</span>
                    {isActive ? (
                      <span
                        aria-hidden
                        className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300"
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Second-level editorial strip (within active channel) ------------ */}
        {activeChannelGroups.length > 0 ? (
          <div
            className="border-b border-border-subtle bg-white/80"
            data-testid="atrium-admin-subnav"
          >
            <div className="mx-auto max-w-[1360px] px-6 md:px-10 py-2 flex flex-wrap gap-4">
              {activeChannelGroups.map((group) => (
                <div key={group.id} className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                    {group.label}
                  </span>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      data-testid={`atrium-admin-subnav-link-${item.to.replace(/\//g, "-")}`}
                      className={({ isActive }) =>
                        cn(
                          "text-xs px-2 py-1 rounded-md no-underline transition-colors",
                          isActive
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Editorial column -------------------------------------------------- */}
        <main className="flex-1 overflow-y-auto" data-testid="atrium-admin-content">
          <div
            className="mx-auto max-w-[1360px] px-6 md:px-10 py-8 md:py-10"
            data-testid="atrium-admin-content-inner"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
