/**
 * UserSwitcher — user switching component (M40).
 *
 * Two variants:
 * - default: full sidebar switcher (AppSidebar)
 * - horizon-rail: compact avatar for HorizonSidebar icon rail
 * - horizon-panel: expanded switcher for HorizonSidebar context panel
 *
 * Shows the active user with an avatar circle.
 * Click opens a dropdown to switch between users.
 * Persists last active user via userStore → localStorage.
 *
 * Horizon design system: semantic color tokens, sidebar surface tokens.
 */

import { useState, useRef, useEffect } from "react";
import { useActiveUser } from "../../hooks/useUsers";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../lib/cn";

export function UserAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "xs";
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
        size === "xs" ? "w-5 h-5 text-[10px]" : size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm",
      )}
    >
      {letter}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared dropdown used by all variants
// ---------------------------------------------------------------------------

function UserDropdown({
  users,
  activeUser,
  setActiveUser,
  onClose,
  position = "above",
  align = "left",
}: {
  users: { id: string; display_name: string; email: string; status: string }[];
  activeUser: { id: string } | null;
  setActiveUser: (id: string) => void;
  onClose: () => void;
  position?: "above" | "below";
  align?: "left" | "right";
}) {
  const activeUsers = users.filter((u) => u.status === "active");

  return (
    <div
      className={cn(
        "absolute z-50",
        "bg-surface-card border border-border-subtle",
        "rounded-lg shadow-lg py-1 min-w-[200px] w-52",
        position === "above" ? "bottom-full mb-1" : "top-full mt-1",
        align === "right" ? "right-0" : "left-0",
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
            onClose();
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
  );
}

// ---------------------------------------------------------------------------
// Classic sidebar switcher (AppSidebar)
// ---------------------------------------------------------------------------

export function UserSwitcher() {
  const { activeUser, users, setActiveUser } = useActiveUser();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0].id);
    }
  }, [activeUser, users, setActiveUser]);

  const displayName = activeUser?.display_name ?? "Kullanici Sec";

  return (
    <div ref={ref} className="relative">
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

      {open && (
        <UserDropdown
          users={users}
          activeUser={activeUser}
          setActiveUser={setActiveUser}
          onClose={() => setOpen(false)}
          position="above"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizon icon rail avatar (compact — only avatar circle)
// ---------------------------------------------------------------------------

export function HorizonUserRailButton() {
  const { activeUser, users, setActiveUser } = useActiveUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0].id);
    }
  }, [activeUser, users, setActiveUser]);

  const displayName = activeUser?.display_name ?? "?";

  return (
    <div ref={ref} className="relative w-full flex items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-8 h-8 rounded-full cursor-pointer transition-all duration-fast",
          "ring-2 ring-transparent hover:ring-brand-400/50",
          open && "ring-brand-400/50",
        )}
        title={activeUser?.display_name ?? "Kullanici Sec"}
        data-testid="horizon-user-rail-btn"
        style={{ padding: 0, border: "none", background: "transparent" }}
      >
        <UserAvatar name={displayName} size="md" />
      </button>

      {open && (
        <div className="absolute left-full ml-2 bottom-0 z-50">
          <UserDropdown
            users={users}
            activeUser={activeUser}
            setActiveUser={setActiveUser}
            onClose={() => setOpen(false)}
            position="above"
            align="left"
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizon context panel user info (expanded — name + role + switch)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Canvas workspace header switcher — compact, theme-semantic, sits in the
// top bar of CanvasAdminLayout / CanvasUserLayout. Uses `bg-surface-card`
// chrome so it reads correctly under every tema (Chalk/Obsidian/Sand/Midnight)
// and never hardcodes light-mode colors.
// ---------------------------------------------------------------------------

export function CanvasHeaderUserSwitcher() {
  const { activeUser, users, setActiveUser } = useActiveUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0].id);
    }
  }, [activeUser, users, setActiveUser]);

  const displayName = activeUser?.display_name ?? "Kullanıcı Seç";
  const roleLabel =
    activeUser?.role === "admin" ? "Yönetici" : "Kullanıcı";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={displayName}
        data-testid="canvas-header-user-switcher"
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-md",
          "border border-border-subtle bg-neutral-0",
          "hover:border-brand-400 transition-colors duration-fast cursor-pointer",
          open && "border-brand-400",
        )}
      >
        <UserAvatar name={displayName} size="sm" />
        <div className="min-w-0 text-left">
          <div className="text-xs font-medium text-neutral-800 truncate max-w-[120px]">
            {displayName}
          </div>
          {activeUser && (
            <div className="text-[10px] text-neutral-500 truncate max-w-[120px]">
              {roleLabel}
            </div>
          )}
        </div>
        <svg
          className={cn(
            "w-3 h-3 text-neutral-500 transition-transform duration-fast shrink-0",
            open && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <UserDropdown
          users={users}
          activeUser={activeUser}
          setActiveUser={setActiveUser}
          onClose={() => setOpen(false)}
          position="below"
          align="right"
        />
      )}
    </div>
  );
}

export function HorizonUserPanelSection() {
  const { activeUser, users, setActiveUser } = useActiveUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0].id);
    }
  }, [activeUser, users, setActiveUser]);

  const displayName = activeUser?.display_name ?? "Kullanici Sec";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg",
          "bg-transparent border border-transparent cursor-pointer",
          "hover:bg-surface-sidebar-hover transition-all duration-fast",
          "text-left",
          open && "bg-surface-sidebar-hover border-surface-sidebar-border",
        )}
        data-testid="horizon-user-panel-btn"
      >
        <UserAvatar name={displayName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-surface-sidebar-text truncate">
            {displayName}
          </div>
          <div className="text-[10px] text-surface-sidebar-text-muted truncate">
            {activeUser?.role === "admin" ? "Yonetici" : "Kullanici"}
          </div>
        </div>
        <svg
          className={cn(
            "w-3 h-3 text-surface-sidebar-text-muted transition-transform duration-fast shrink-0",
            open && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 z-50">
          <UserDropdown
            users={users}
            activeUser={activeUser}
            setActiveUser={setActiveUser}
            onClose={() => setOpen(false)}
            position="above"
          />
        </div>
      )}
    </div>
  );
}
