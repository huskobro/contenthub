/**
 * UserSwitcher — sidebar user switching component (M40).
 *
 * Shows the active user with an avatar circle.
 * Click opens a dropdown to switch between users.
 * Persists last active user via userStore → localStorage.
 *
 * Horizon design system: semantic color tokens, border-border-*, bg-surface-*.
 * Sidebar context: uses text-neutral-200 for dark sidebar backgrounds.
 */

import { useState, useRef, useEffect } from "react";
import { useActiveUser } from "../../hooks/useUsers";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../lib/cn";

function UserAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const letter = (name || "?")[0].toUpperCase();
  const colors = [
    "bg-brand-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-violet-600",
    "bg-cyan-600",
  ];
  const colorIdx = name
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold shrink-0",
        colors[colorIdx],
        size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm",
      )}
    >
      {letter}
    </div>
  );
}

export function UserSwitcher() {
  const { activeUser, users, setActiveUser } = useActiveUser();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Auto-select first user if none selected
  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0].id);
    }
  }, [activeUser, users, setActiveUser]);

  const activeUsers = users.filter((u) => u.status === "active");
  const displayName = activeUser?.display_name ?? "Kullanici Sec";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
          "hover:bg-neutral-800/40 transition-colors duration-fast cursor-pointer",
          "border border-transparent",
          open && "bg-neutral-800/40 border-border-subtle",
        )}
        title={displayName}
      >
        <UserAvatar name={displayName} size={collapsed ? "sm" : "md"} />
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-medium text-neutral-200 truncate">
              {displayName}
            </div>
            {activeUser && (
              <div className="text-[10px] text-neutral-500 truncate">
                {activeUser.role === "admin" ? "Yonetici" : "Kullanici"}
              </div>
            )}
          </div>
        )}
        {!collapsed && (
          <svg
            className={cn(
              "w-3.5 h-3.5 text-neutral-500 transition-transform duration-fast",
              open && "rotate-180",
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute bottom-full mb-1",
            "bg-surface-card border border-border-subtle",
            "rounded-lg shadow-lg py-1 z-50",
            collapsed ? "left-0 w-52" : "left-0 right-0 min-w-[200px]",
          )}
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Kullanici Degistir
          </div>
          {activeUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setActiveUser(user.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-left",
                "transition-colors duration-fast cursor-pointer",
                user.id === activeUser?.id
                  ? "bg-brand-50"
                  : "hover:bg-neutral-50",
              )}
            >
              <UserAvatar name={user.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "text-sm truncate",
                    user.id === activeUser?.id
                      ? "font-semibold text-brand-700"
                      : "font-medium text-neutral-800",
                  )}
                >
                  {user.display_name}
                </div>
                <div className="text-xs text-neutral-500 truncate">
                  {user.email}
                </div>
              </div>
              {user.id === activeUser?.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
              )}
            </button>
          ))}

          {activeUsers.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-500 italic">
              Henuz kullanici olusturulmamis
            </div>
          )}
        </div>
      )}
    </div>
  );
}
