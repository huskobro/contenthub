/**
 * HorizonSidebar — Radical new sidebar for Horizon design mode
 *
 * Two-layer sidebar:
 * 1. Icon Rail (48px) — always visible, shows category icons
 * 2. Context Panel (240px) — expands on hover/click, shows nav + search + stats
 *
 * No traditional header — brand identity and search live here.
 * Completely different from AppSidebar (classic mode).
 */

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HorizonNavGroup {
  id: string;
  label: string;
  icon: string;     // emoji or single char
  items: { label: string; to: string }[];
}

interface HorizonSidebarProps {
  groups: HorizonNavGroup[];
  brandLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HorizonSidebar({ groups, brandLabel = "ContentHub" }: HorizonSidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [userSelectedGroup, setUserSelectedGroup] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Auto-select group based on current route — find the MOST SPECIFIC match
  // (longest matching path wins, so "/admin/sources" beats "/admin")
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const routeChanged = prevPathRef.current !== location.pathname;
    prevPathRef.current = location.pathname;

    // Only auto-select when route changes OR on first mount
    if (!routeChanged && userSelectedGroup) return;

    if (routeChanged) setUserSelectedGroup(false);

    // Find the group with the longest (most specific) matching item path
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
        className="w-[48px] shrink-0 flex flex-col items-center bg-surface-sidebar border-r border-surface-sidebar-border"
        style={{
          backgroundImage: "linear-gradient(180deg, color-mix(in srgb, var(--ch-brand-500) 6%, transparent) 0%, transparent 40%)",
        }}
      >
        {/* Brand Icon */}
        <div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold mt-3 mb-4 shrink-0 cursor-pointer"
          style={{ boxShadow: "0 0 12px color-mix(in srgb, var(--ch-brand-500) 30%, transparent)" }}
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Paneli kapat" : "Paneli ac"}
          data-testid="horizon-brand-icon"
        >
          CH
        </div>

        {/* Group Icons */}
        <div className="flex flex-col gap-1 flex-1 w-full px-1">
          {groups.map((group) => {
            const isActive = activeGroupId === group.id;
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
                  "w-full aspect-square flex items-center justify-center rounded-lg text-base cursor-pointer border-none transition-all duration-fast",
                  isActive
                    ? "bg-surface-sidebar-active text-surface-sidebar-text-active"
                    : "bg-transparent text-surface-sidebar-text-muted hover:bg-surface-sidebar-hover hover:text-surface-sidebar-text"
                )}
              >
                <span className="text-[16px] leading-none">{group.icon}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom: expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 flex items-center justify-center text-surface-sidebar-text-muted hover:text-surface-sidebar-text bg-transparent border-none cursor-pointer transition-colors duration-fast text-sm"
          title={expanded ? "Kapat" : "Genislet"}
          data-testid="horizon-expand-toggle"
        >
          {expanded ? "\u2039" : "\u203a"}
        </button>
      </div>

      {/* === Context Panel === */}
      <div
        className={cn(
          "overflow-hidden bg-surface-sidebar border-r border-surface-sidebar-border flex flex-col transition-all duration-normal",
          expanded ? "w-[240px] opacity-100" : "w-0 opacity-0"
        )}
      >
        {/* Brand Title */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-surface-sidebar-text text-md font-bold font-heading tracking-[-0.02em] m-0">
            {brandLabel}
          </h2>
          <p className="text-surface-sidebar-text-muted text-xs mt-0.5 m-0">
            {activeGroup ? activeGroup.label : "Navigasyon"}
          </p>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-sidebar-border bg-surface-sidebar-hover text-surface-sidebar-text-muted text-sm cursor-pointer transition-colors duration-fast hover:border-brand-500/30"
            onClick={() => {
              // Trigger command palette
              const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
            data-testid="horizon-search"
          >
            <span className="text-xs">&#x2318;K</span>
            <span className="text-xs truncate">Ara veya komut...</span>
          </div>
        </div>

        {/* Nav Items for active group */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1">
          {activeGroup ? (
            <ul className="list-none m-0 p-0">
              {activeGroup.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-1.5 text-sm rounded-lg no-underline transition-all duration-fast my-0.5 truncate",
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

        {/* Bottom: quick stats or version */}
        <div className="px-4 py-3 border-t border-surface-sidebar-border shrink-0">
          <p className="text-[10px] text-surface-sidebar-text-muted m-0 uppercase tracking-[0.1em]">
            Horizon v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
