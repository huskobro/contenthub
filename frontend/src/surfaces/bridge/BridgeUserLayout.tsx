/**
 * BridgeUserLayout — Ops-style user shell (Faz 5).
 *
 * Bridge'in user panel karşılığı. BridgeAdminLayout ile aynı görsel dil:
 *   - 64 px icon rail + 240 px context panel + content column
 *   - yoğun / operasyon / komut-merkezi hissi
 *   - aynı klavye navigasyonu (roving tabindex, digit hotkeys)
 *   - aynı Turkish uppercase fix
 *
 * Kaynak: HORIZON_USER_GROUPS verisi (görünürlük yok, sadece module toggle
 * filtresi). Command palette: buildUserNavigationCommands + actionCommands.
 * Notification scope = user.
 *
 * Contract preservation:
 *   - <Outlet /> — page override'lar register.tsx tarafından yönetilir.
 *   - Panel switch (USR ↔ ADM) rail altında, user shell'den admin panele
 *     gitmek için sadece admin kullanıcılar görebilir (role guard).
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
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
import { filterHorizonUserGroups } from "../../app/layouts/useLayoutNavigation";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import type { HorizonNavGroup } from "../../components/layout/HorizonSidebar";
import { useAuthStore } from "../../stores/authStore";

// ---------------------------------------------------------------------------
// Rail model — kullanıcı tarafı 6 ops slot'u etrafında örgütlenmiştir.
// ---------------------------------------------------------------------------

interface BridgeUserRailSlot {
  id: string;
  label: string;
  glyph: string;
  matchPrefix: string;
  /** İlgili horizon user grupları. */
  groupIds: string[];
  /** Fallback: bu slot'taki ilk item görünmezse navigate buraya düşer. */
  fallback: string;
}

const BRIDGE_USER_RAIL: BridgeUserRailSlot[] = [
  {
    id: "home",
    label: "Anasayfa",
    glyph: "HM",
    matchPrefix: "/user",
    groupIds: ["home"],
    fallback: "/user",
  },
  {
    id: "projects",
    label: "Projeler",
    glyph: "PJ",
    matchPrefix: "/user/projects",
    groupIds: ["projects", "create"],
    fallback: "/user/projects",
  },
  {
    id: "content",
    label: "İçerik",
    glyph: "CT",
    matchPrefix: "/user/content",
    groupIds: ["content"],
    fallback: "/user/content",
  },
  {
    id: "publish",
    label: "Yayın",
    glyph: "PB",
    matchPrefix: "/user/publish",
    groupIds: ["publish", "engagement", "channels"],
    fallback: "/user/publish",
  },
  {
    id: "automation",
    label: "Otomasyon",
    glyph: "AU",
    matchPrefix: "/user/automation",
    groupIds: ["automation"],
    fallback: "/user/automation",
  },
  {
    id: "insight",
    label: "İçgörü",
    glyph: "IN",
    matchPrefix: "/user/analytics",
    groupIds: ["analytics", "settings"],
    fallback: "/user/analytics",
  },
];

function pickActiveSlot(pathname: string): BridgeUserRailSlot {
  // Longest prefix match. "/user" tam match için özel durum — /user/projects
  // yolunda "home" slot'u seçilmesin diye prefix=="/user" sadece tam "/user"
  // veya "/user/" için match sayılır.
  let best: BridgeUserRailSlot | null = null;
  let bestLen = -1;
  for (const slot of BRIDGE_USER_RAIL) {
    if (slot.matchPrefix === "/user") {
      if (pathname === "/user" || pathname === "/user/") {
        if (slot.matchPrefix.length > bestLen) {
          best = slot;
          bestLen = slot.matchPrefix.length;
        }
      }
      continue;
    }
    if (
      pathname.startsWith(slot.matchPrefix) &&
      slot.matchPrefix.length > bestLen
    ) {
      best = slot;
      bestLen = slot.matchPrefix.length;
    }
  }
  return best ?? BRIDGE_USER_RAIL[0];
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function BridgeUserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === "admin";

  // Module-aware user nav filtering. Disabled modules get pruned identically
  // to HorizonUserLayout so Bridge's user shell stays consistent.
  const { enabledMap } = useEnabledModules();
  const groups: HorizonNavGroup[] = useMemo(
    () => filterHorizonUserGroups(enabledMap),
    [enabledMap],
  );

  useCommandPaletteShortcut();
  useGlobalSSE();
  useNotifications({ mode: "user" });

  useEffect(() => {
    useCommandPaletteStore
      .getState()
      .setContext({ currentRoute: location.pathname });
  }, [location.pathname]);

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

  // Cmd/Ctrl+Shift+A — admin panele geçiş (yalnızca admin rolü).
  useEffect(() => {
    if (!isAdmin) return undefined;
    function onKey(e: KeyboardEvent) {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "A" || e.key === "a")
      ) {
        e.preventDefault();
        e.stopPropagation();
        navigate("/admin");
      }
    }
    document.addEventListener("keydown", onKey, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKey, { capture: true });
  }, [isAdmin, navigate]);

  const activeSlot = pickActiveSlot(location.pathname);
  const activeSlotIndex = BRIDGE_USER_RAIL.findIndex(
    (s) => s.id === activeSlot.id,
  );

  const contextSections = useMemo(() => {
    return groups.filter((g) => activeSlot.groupIds.includes(g.id));
  }, [groups, activeSlot]);

  // ----- Keyboard navigation on the rail (aynı BridgeAdmin pattern) ------
  const railRef = useRef<HTMLElement | null>(null);
  const [focusedRailIndex, setFocusedRailIndex] = useState<number>(
    activeSlotIndex >= 0 ? activeSlotIndex : 0,
  );

  useEffect(() => {
    if (activeSlotIndex >= 0) {
      setFocusedRailIndex(activeSlotIndex);
    }
  }, [activeSlotIndex]);

  const navigateToSlot = useCallback(
    (slot: BridgeUserRailSlot) => {
      const slotGroup = groups.find((g) => slot.groupIds.includes(g.id));
      const target = slotGroup?.items?.[0]?.to ?? slot.fallback;
      navigate(target);
    },
    [groups, navigate],
  );

  const focusRailButton = useCallback((index: number) => {
    const root = railRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(
      `[data-testid="bridge-user-rail-${BRIDGE_USER_RAIL[index]?.id}"]`,
    );
    btn?.focus();
  }, []);

  const handleRailKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const n = BRIDGE_USER_RAIL.length;
      if (n === 0) return;
      let nextIndex = focusedRailIndex;
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          nextIndex = (focusedRailIndex + 1) % n;
          break;
        case "ArrowUp":
        case "ArrowLeft":
          nextIndex = (focusedRailIndex - 1 + n) % n;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = n - 1;
          break;
        case "Enter":
        case " ": {
          event.preventDefault();
          const slot = BRIDGE_USER_RAIL[focusedRailIndex];
          if (slot) navigateToSlot(slot);
          return;
        }
        default:
          return;
      }
      event.preventDefault();
      setFocusedRailIndex(nextIndex);
      requestAnimationFrame(() => focusRailButton(nextIndex));
    },
    [focusedRailIndex, navigateToSlot, focusRailButton],
  );

  // Digit hotkeys (1..6) — aynı admin layout pattern.
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      const digit = parseInt(e.key, 10);
      if (
        !Number.isNaN(digit) &&
        digit >= 1 &&
        digit <= BRIDGE_USER_RAIL.length
      ) {
        const slot = BRIDGE_USER_RAIL[digit - 1];
        if (slot) {
          e.preventDefault();
          setFocusedRailIndex(digit - 1);
          navigateToSlot(slot);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigateToSlot]);

  return (
    <ThemeProvider>
      <div
        className="min-h-screen flex bg-surface-page"
        data-testid="bridge-user-layout"
        data-surface="bridge"
      >
        <ToastContainer />
        <CommandPalette />
        <NotificationCenter />
        <KeyboardShortcutsHelp />

        {/* Rail (64px) ---------------------------------------------------- */}
        <aside
          className="flex flex-col items-center shrink-0 border-r border-border-subtle bg-surface-inset"
          style={{ width: "64px" }}
          data-testid="bridge-user-rail"
        >
          <div className="h-header flex items-center justify-center w-full border-b border-border-subtle">
            <span className="text-[10px] font-mono tracking-widest text-neutral-500">
              CH
            </span>
          </div>
          <nav
            ref={(el) => {
              railRef.current = el;
            }}
            className="flex flex-col gap-1 py-2 w-full items-center"
            role="navigation"
            aria-label="Bridge kullanıcı rayı"
            onKeyDown={handleRailKeyDown}
            data-testid="bridge-user-rail-nav"
          >
            {BRIDGE_USER_RAIL.map((slot, index) => {
              const isActive = slot.id === activeSlot.id;
              const isFocused = index === focusedRailIndex;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setFocusedRailIndex(index);
                    navigateToSlot(slot);
                  }}
                  onFocus={() => setFocusedRailIndex(index)}
                  title={`${slot.label} (${index + 1})`}
                  data-testid={`bridge-user-rail-${slot.id}`}
                  data-active={isActive ? "true" : undefined}
                  aria-label={slot.label}
                  aria-current={isActive ? "page" : undefined}
                  tabIndex={isFocused ? 0 : -1}
                  className={`w-10 h-10 flex items-center justify-center rounded-md text-[11px] font-mono font-semibold tracking-wide transition-colors cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
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
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="w-10 h-10 flex items-center justify-center rounded-md text-[10px] font-mono text-neutral-500 bg-transparent border border-border-subtle hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer"
                title="Yönetim Paneli"
                aria-label="Yönetim Paneli"
                data-testid="bridge-user-panel-switch"
                data-panel-switch="bridge"
              >
                ADM
              </button>
            )}
          </div>
        </aside>

        {/* Context panel (240px) ------------------------------------------ */}
        <aside
          className="shrink-0 border-r border-border-subtle bg-surface-page flex flex-col"
          style={{ width: "240px" }}
          data-testid="bridge-user-context-panel"
        >
          <div
            className="h-header flex items-center border-b border-border-subtle"
            style={{ padding: "0 16px" }}
          >
            <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-500">
              {activeSlot.label}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {contextSections.length === 0 && (
              <p className="text-xs text-neutral-400 px-4 py-2 m-0">
                Bu alanda görünür öge yok.
              </p>
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
                        end={item.to === "/user"}
                        className={({ isActive }) =>
                          `block px-4 py-1.5 text-xs no-underline border-l-2 transition-colors ${
                            isActive
                              ? "text-neutral-900 font-semibold border-l-brand-500 bg-neutral-50"
                              : "text-neutral-600 border-l-transparent hover:bg-neutral-50 hover:text-neutral-800"
                          }`
                        }
                        data-testid={`bridge-user-context-link-${item.to}`}
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

        {/* Content column ------------------------------------------------- */}
        <div className="flex flex-col flex-1 min-w-0">
          <header
            className="h-header flex items-center border-b border-border-subtle bg-surface-page shrink-0"
            style={{ padding: "0 var(--ch-page-padding)" }}
            data-testid="bridge-user-header"
          >
            <div className="flex items-center gap-2 text-xs text-neutral-500 min-w-0 flex-1">
              <span
                className="font-mono uppercase tracking-wider text-[10px] text-neutral-400"
                data-testid="bridge-user-breadcrumb"
              >
                BRIDGE · {activeSlot.label.toLocaleUpperCase("tr-TR")}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => useCommandPaletteStore.getState().open()}
                className="flex items-center gap-2 px-2.5 py-1 text-xs text-neutral-500 bg-surface-inset border border-border-subtle rounded-md cursor-pointer hover:border-brand-400"
                data-testid="bridge-user-command-trigger"
                title="Komut Paleti (⌘K)"
              >
                <span>Komut ara</span>
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
            data-testid="bridge-user-content"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
