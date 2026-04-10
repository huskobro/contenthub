/**
 * BridgeAdminLayout — Ops-oriented 3-panel admin shell
 *
 * Faz 2 — Bridge prototype.
 *
 * Structure (left to right):
 *   1. Rail (64px)   — icon-only primary nav + scope switch
 *   2. Context panel — grouped sub-navigation for the current area
 *   3. Content       — header + route outlet
 *
 * This shell is deliberately dense / operational. It reuses:
 *   - ThemeProvider (so CSS variable tokens still apply)
 *   - ToastContainer, CommandPalette, NotificationCenter (shared infra)
 *   - useGlobalSSE, useNotifications (same realtime contract as legacy)
 *   - buildAdminNavigationCommands + buildAdminActionCommands (same command set)
 *   - useAdminVisibilityMap + filterHorizonAdminGroups (same visibility rules)
 *
 * Contract preservation:
 *   - Same routes, same <Outlet />
 *   - Same permissions / visibility enforcement
 *   - Same SSE pipeline
 *   - Same notification scope (admin)
 *   - Legacy fallback is automatic: if Bridge isn't resolved, DynamicAdminLayout
 *     simply renders AdminLayout instead of this component.
 */

import { useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import { ThemeProvider } from "../../components/design-system/ThemeProvider";
import { ToastContainer } from "../../components/design-system/Toast";
import { CommandPalette } from "../../components/design-system/CommandPalette";
import { NotificationCenter, NotificationBell } from "../../components/design-system/NotificationCenter";
import { KeyboardShortcutsHelp } from "../../components/design-system/KeyboardShortcutsHelp";
import { useCommandPaletteShortcut } from "../../hooks/useCommandPaletteShortcut";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { useNotifications } from "../../hooks/useNotifications";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { buildAdminNavigationCommands, buildAdminActionCommands } from "../../commands/adminCommands";
import { buildContextualCommands } from "../../commands/contextualCommands";
import { useAdminVisibilityMap, filterHorizonAdminGroups } from "../../app/layouts/useLayoutNavigation";
import type { HorizonNavGroup } from "../../components/layout/HorizonSidebar";
import { useEnabledModules } from "../../hooks/useEnabledModules";

// ---------------------------------------------------------------------------
// Rail model — ops areas are collapsed into 6 primary slots. Secondary routes
// inside each area land in the context panel below.
// ---------------------------------------------------------------------------

interface BridgeRailSlot {
  id: string;
  label: string;
  /** Short 2-char glyph — we avoid icon fonts so there are no asset deps. */
  glyph: string;
  /** Prefix that the route must start with to count as "active" for this slot. */
  matchPrefix: string;
  /** Which horizon nav group ids feed the context panel for this slot. */
  groupIds: string[];
}

const BRIDGE_RAIL: BridgeRailSlot[] = [
  {
    id: "ops",
    label: "Ops",
    glyph: "OP",
    matchPrefix: "/admin/jobs",
    // Ops rail pulls from system group (which contains "Isler") — we filter to
    // job-related items in the context panel builder below.
    groupIds: ["system"],
  },
  {
    id: "publish",
    label: "Publish",
    glyph: "PB",
    matchPrefix: "/admin/publish",
    groupIds: ["publish", "engagement"],
  },
  {
    id: "content",
    label: "Content",
    glyph: "CT",
    matchPrefix: "/admin/library",
    groupIds: ["content"],
  },
  {
    id: "news",
    label: "News",
    glyph: "NW",
    matchPrefix: "/admin/sources",
    groupIds: ["news"],
  },
  {
    id: "insights",
    label: "Insights",
    glyph: "IN",
    matchPrefix: "/admin/analytics",
    groupIds: ["analytics", "overview"],
  },
  {
    id: "system",
    label: "System",
    glyph: "SY",
    matchPrefix: "/admin/settings",
    groupIds: ["system", "appearance"],
  },
];

function pickActiveSlot(pathname: string): BridgeRailSlot {
  // Longest prefix match wins; fall back to first slot.
  let best: BridgeRailSlot | null = null;
  let bestLen = -1;
  for (const slot of BRIDGE_RAIL) {
    if (pathname.startsWith(slot.matchPrefix) && slot.matchPrefix.length > bestLen) {
      best = slot;
      bestLen = slot.matchPrefix.length;
    }
  }
  return best ?? BRIDGE_RAIL[0];
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function BridgeAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const visibilityMap = useAdminVisibilityMap();
  const { enabledMap } = useEnabledModules();
  // Reuse the same horizon grouping so visibility + module toggles are enforced
  // identically to the legacy admin shells. Bridge adds NO new surface-specific
  // nav items; it only re-presents them.
  const groups: HorizonNavGroup[] = useMemo(
    () => filterHorizonAdminGroups(visibilityMap, enabledMap),
    [visibilityMap, enabledMap],
  );

  // Standard admin infra hooks. Bridge does NOT own its own command palette;
  // it registers the same command set the legacy shell does.
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
    const allCmds = [...navCmds, ...actionCmds, ...ctxCmds];
    useCommandPaletteStore.getState().registerCommands(allCmds);
    return () => {
      useCommandPaletteStore.getState().unregisterCommands(allCmds.map((c) => c.id));
    };
  }, [navigate]);

  const activeSlot = pickActiveSlot(location.pathname);

  // Context panel items = every horizon group whose id matches the active slot,
  // flattened into a single list of (groupLabel, items[]) sections.
  const contextSections = useMemo(() => {
    return groups.filter((g) => activeSlot.groupIds.includes(g.id));
  }, [groups, activeSlot]);

  return (
    <ThemeProvider>
      <div
        className="min-h-screen flex bg-surface-page"
        data-testid="bridge-admin-layout"
        data-surface="bridge"
      >
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        {/* ---- Rail (64px) ------------------------------------------------ */}
        <aside
          className="flex flex-col items-center shrink-0 border-r border-border-subtle bg-surface-inset"
          style={{ width: "64px" }}
          data-testid="bridge-rail"
        >
          <div className="h-header flex items-center justify-center w-full border-b border-border-subtle">
            <span className="text-[10px] font-mono tracking-widest text-neutral-500">CH</span>
          </div>
          <nav className="flex flex-col gap-1 py-2 w-full items-center">
            {BRIDGE_RAIL.map((slot) => {
              const isActive = slot.id === activeSlot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => {
                    // Navigate to the first concrete item of the slot's first group,
                    // or fall back to the prefix itself if no items are visible.
                    const group = groups.find((g) => activeSlot.groupIds.includes(g.id));
                    const target = group?.items?.[0]?.to ?? slot.matchPrefix;
                    // For the current slot, prefer its own default
                    const slotGroup = groups.find((g) => slot.groupIds.includes(g.id));
                    const slotTarget = slotGroup?.items?.[0]?.to ?? slot.matchPrefix;
                    navigate(slot.id === activeSlot.id ? target : slotTarget);
                  }}
                  title={slot.label}
                  data-testid={`bridge-rail-${slot.id}`}
                  data-active={isActive ? "true" : undefined}
                  className={`w-10 h-10 flex items-center justify-center rounded-md text-[11px] font-mono font-semibold tracking-wide transition-colors cursor-pointer border ${
                    isActive
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-transparent text-neutral-500 border-transparent hover:bg-neutral-100 hover:text-neutral-800"
                  }`}
                >
                  {slot.glyph}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto mb-3 flex flex-col items-center gap-1">
            <button
              onClick={() => navigate("/user")}
              className="w-10 h-10 flex items-center justify-center rounded-md text-[10px] font-mono text-neutral-500 bg-transparent border border-border-subtle hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer"
              title="Kullanici Paneline gec"
              data-testid="bridge-scope-switch"
            >
              USR
            </button>
          </div>
        </aside>

        {/* ---- Context panel (240px) ------------------------------------- */}
        <aside
          className="shrink-0 border-r border-border-subtle bg-surface-page flex flex-col"
          style={{ width: "240px" }}
          data-testid="bridge-context-panel"
        >
          <div className="h-header flex items-center border-b border-border-subtle" style={{ padding: "0 16px" }}>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-500">
              {activeSlot.label}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {contextSections.length === 0 && (
              <p className="text-xs text-neutral-400 px-4 py-2 m-0">Bu alanda gorunur oge yok.</p>
            )}
            {contextSections.map((section) => (
              <div key={section.id} className="mb-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-4 py-1">
                  {section.label}
                </div>
                <ul className="list-none m-0 p-0">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/admin"}
                        className={({ isActive }) =>
                          `block px-4 py-1.5 text-xs no-underline border-l-2 transition-colors ${
                            isActive
                              ? "text-neutral-900 font-semibold border-l-brand-500 bg-neutral-50"
                              : "text-neutral-600 border-l-transparent hover:bg-neutral-50 hover:text-neutral-800"
                          }`
                        }
                        data-testid={`bridge-context-link-${item.to}`}
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* ---- Content column --------------------------------------------- */}
        <div className="flex flex-col flex-1 min-w-0">
          <header
            className="h-header flex items-center border-b border-border-subtle bg-surface-page shrink-0"
            style={{ padding: "0 var(--ch-page-padding)" }}
            data-testid="bridge-header"
          >
            <div className="flex items-center gap-2 text-xs text-neutral-500 min-w-0 flex-1">
              <span className="font-mono uppercase tracking-wider text-[10px] text-neutral-400">
                bridge / ops
              </span>
              <span className="text-neutral-300">|</span>
              <span className="font-medium text-neutral-700 truncate">{location.pathname}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => useCommandPaletteStore.getState().open()}
                className="flex items-center gap-2 px-2.5 py-1 text-xs text-neutral-500 bg-surface-inset border border-border-subtle rounded-md cursor-pointer hover:border-brand-400"
                data-testid="bridge-command-trigger"
                title="Komut Paleti (⌘K)"
              >
                <span>Komut...</span>
                <kbd className="text-[10px] font-mono bg-neutral-100 px-1 rounded border border-border-subtle text-neutral-500">
                  ⌘K
                </kbd>
              </button>
              <NotificationBell />
            </div>
          </header>
          <main
            className="flex-1 bg-surface-page overflow-y-auto"
            style={{ padding: "var(--ch-page-padding)" }}
            data-testid="bridge-content"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
