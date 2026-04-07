/**
 * HorizonSidebar — Premium two-layer sidebar for Horizon design mode
 *
 * 1. Icon Rail (56px) — always visible, proper lucide icons, brand mark
 * 2. Context Panel (256px) — expands on hover/click, nav + search
 *
 * CM-inspired visual language: dark surfaces, subtle gradients,
 * clean active states, premium spacing.
 */

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  Pencil,
  Send,
  BarChart3,
  Newspaper,
  Palette,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { HorizonUserRailButton, HorizonUserPanelSection } from "./UserSwitcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HorizonNavGroup {
  id: string;
  label: string;
  icon: string; // icon key — mapped to lucide below
  items: { label: string; to: string; moduleId?: string }[];
}

interface HorizonSidebarProps {
  groups: HorizonNavGroup[];
  brandLabel?: string;
}

// ---------------------------------------------------------------------------
// Icon mapping — replaces emoji with lucide icons
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  "\u25C9": LayoutDashboard, // overview
  "\u2699": Settings,        // system
  "\u270E": Pencil,          // content
  "\u25B6": Send,            // publish
  "\u2261": BarChart3,       // analytics
  "\u2139": Newspaper,       // news
  "\u25D0": Palette,         // appearance
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HorizonSidebar({ groups, brandLabel = "ContentHub" }: HorizonSidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [userSelectedGroup, setUserSelectedGroup] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Auto-select group based on current route — most specific match wins
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const routeChanged = prevPathRef.current !== location.pathname;
    prevPathRef.current = location.pathname;

    if (!routeChanged && userSelectedGroup) return;
    if (routeChanged) setUserSelectedGroup(false);

    let bestGroup: string | null = null;
    let bestMatchLength = -1;

    for (const group of groups) {
      for (const item of group.items) {
        const matches =
          location.pathname === item.to ||
          location.pathname.startsWith(item.to + "/");
        if (matches && item.to.length > bestMatchLength) {
          bestMatchLength = item.to.length;
          bestGroup = group.id;
        }
      }
    }

    if (bestGroup) {
      setActiveGroupId(bestGroup);
    }
  }, [location.pathname, groups, userSelectedGroup]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-sidebar flex",
        "transition-all duration-normal"
      )}
      data-testid="horizon-sidebar"
    >
      {/* === Icon Rail === */}
      <div
        className="w-sidebar-collapsed shrink-0 flex flex-col items-center bg-surface-sidebar border-r border-surface-sidebar-border"
        style={{
          backgroundImage: "linear-gradient(180deg, color-mix(in srgb, var(--ch-brand-500) 8%, transparent) 0%, transparent 50%)",
        }}
      >
        {/* Brand Mark */}
        <div
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-[11px] font-bold mt-4 mb-5 shrink-0 cursor-pointer select-none"
          style={{ boxShadow: "0 2px 12px color-mix(in srgb, var(--ch-brand-500) 35%, transparent)" }}
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Paneli kapat" : "Paneli ac"}
          data-testid="horizon-brand-icon"
        >
          CH
        </div>

        {/* Group Icons */}
        <div className="flex flex-col gap-0.5 flex-1 w-full px-2">
          {groups.map((group) => {
            const isActive = activeGroupId === group.id;
            const IconComponent = ICON_MAP[group.icon];
            return (
              <button
                key={group.id}
                onClick={() => {
                  setActiveGroupId(group.id);
                  setUserSelectedGroup(true);
                  setExpanded(true);
                }}
                title={group.label}
                data-testid={`horizon-rail-${group.id}`}
                className={cn(
                  "w-full aspect-square flex items-center justify-center rounded-lg cursor-pointer border-none transition-all duration-fast",
                  isActive
                    ? "bg-surface-sidebar-active text-surface-sidebar-text-active shadow-sm"
                    : "bg-transparent text-surface-sidebar-text-muted hover:bg-surface-sidebar-hover hover:text-surface-sidebar-text"
                )}
              >
                {IconComponent ? (
                  <IconComponent className="w-[18px] h-[18px]" />
                ) : (
                  <span className="text-[16px] leading-none">{group.icon}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom: user avatar + expand toggle */}
        <div className="flex flex-col items-center gap-2 pb-3 shrink-0">
          <HorizonUserRailButton />
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-1.5 flex items-center justify-center text-surface-sidebar-text-muted hover:text-surface-sidebar-text bg-transparent border-none cursor-pointer transition-colors duration-fast"
            title={expanded ? "Kapat" : "Genislet"}
            data-testid="horizon-expand-toggle"
          >
            {expanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* === Context Panel === */}
      <div
        className={cn(
          "overflow-hidden bg-surface-sidebar border-r border-surface-sidebar-border flex flex-col transition-all duration-normal",
          expanded ? "opacity-100" : "w-0 opacity-0"
        )}
        style={expanded ? { width: "calc(var(--ch-sidebar-width) - var(--ch-sidebar-collapsed-width))" } : undefined}
      >
        {/* Brand Title */}
        <div className="px-5 pt-5 pb-1 shrink-0">
          <h2 className="text-surface-sidebar-text text-md font-bold font-heading tracking-[-0.02em] m-0">
            {brandLabel}
          </h2>
          <p className="text-surface-sidebar-text-muted text-xs mt-1 m-0">
            {activeGroup ? activeGroup.label : "Navigasyon"}
          </p>
        </div>

        {/* Search trigger */}
        <div className="px-4 py-3 shrink-0">
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-surface-sidebar-border bg-surface-sidebar-hover/50 text-surface-sidebar-text-muted text-sm cursor-pointer transition-all duration-fast hover:border-brand-500/40 hover:bg-surface-sidebar-hover"
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
            data-testid="horizon-search"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs truncate flex-1">Ara veya komut...</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-surface-sidebar-border text-surface-sidebar-text-muted leading-none">
              &#x2318;K
            </kbd>
          </div>
        </div>

        {/* Nav Items for active group */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-1">
          {activeGroup ? (
            <ul className="list-none m-0 p-0">
              {activeGroup.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/admin"}
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-2 text-sm rounded-lg no-underline transition-all duration-fast my-0.5 truncate",
                        isActive
                          ? "font-medium text-surface-sidebar-text-active bg-surface-sidebar-active"
                          : "font-normal text-surface-sidebar-text-muted hover:bg-surface-sidebar-hover hover:text-surface-sidebar-text"
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-4 text-xs text-surface-sidebar-text-muted">
              Bir kategori seciniz.
            </div>
          )}
        </nav>

        {/* Bottom: user switcher */}
        <div className="px-3 py-3 border-t border-surface-sidebar-border shrink-0">
          <HorizonUserPanelSection />
        </div>
      </div>
    </div>
  );
}
