/**
 * AdminScopeSwitcher — Redesign REV-2 / P1.1.
 *
 * Admin-only compact switcher that sits in AppHeader. It drives the
 * `adminScopeStore` (see P0.2) which is the single source of truth for
 * "Tüm Kullanıcılar" vs "Kullanıcı: X" scope. The scope flows through
 * `useActiveScope()` into React Query keys and, where relevant, into
 * `owner_user_id` fetch params (see P0.3a/b/c).
 *
 * Important distinctions vs existing components (NOT a parallel pattern):
 * - `UserSwitcher` / `HorizonUserPanelSection` switch the dev-time *active
 *   identity* via `useActiveUser()` (localStorage-based impersonation
 *   helper used before real auth existed). That is IDENTITY selection.
 * - This switcher does NOT change identity. The logged-in admin stays
 *   the same. It only narrows or widens the *scope* the admin is looking
 *   at, for every scope-aware query in the app.
 *
 * CLAUDE.md alignment:
 * - No hidden behavior: scope is visible here + echoed by scope-aware
 *   query keys; no silent magic flags.
 * - Backend authority unchanged: non-admin roles never render this
 *   component; backend ignores `owner_id` overrides for non-admins.
 * - No parallel pattern: this is the single UI surface for admin scope.
 * - Design tokens: `surface-inset`, `border-subtle`, `brand-*` — no raw
 *   neutral-100/200 interior colors per design-tokens-guide.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers, type UserResponse } from "../../api/usersApi";
import { useAdminScopeStore } from "../../stores/adminScopeStore";
import { useActiveScope } from "../../hooks/useActiveScope";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Avatar (duplicated intentionally — `UserSwitcher.UserAvatar` lives in a
// separate identity-selection component; importing across concerns would
// blur the boundary. Kept small and private here.)
// ---------------------------------------------------------------------------

function ScopeAvatar({ label, variant = "user" }: { label: string; variant?: "all" | "user" }) {
  if (variant === "all") {
    // Stylised "all users" avatar — two overlapping circles.
    return (
      <div
        className={cn(
          "shrink-0 w-6 h-6 rounded-full border border-brand-300 bg-brand-50",
          "flex items-center justify-center text-[10px] font-semibold text-brand-700",
        )}
        aria-hidden="true"
      >
        ∀
      </div>
    );
  }
  const letter = (label || "?")[0].toUpperCase();
  const colors = [
    "bg-brand-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-violet-600",
    "bg-cyan-600",
  ];
  const colorIdx =
    label.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return (
    <div
      className={cn(
        "shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
        "text-[10px] font-semibold text-white",
        colors[colorIdx],
      )}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminScopeSwitcherProps {
  /** Optional extra class — typically a left margin to fit into AppHeader. */
  className?: string;
}

export function AdminScopeSwitcher({ className }: AdminScopeSwitcherProps) {
  const scope = useActiveScope();
  const mode = useAdminScopeStore((s) => s.mode);
  const focusedUserId = useAdminScopeStore((s) => s.userId);
  const setAll = useAdminScopeStore((s) => s.setAll);
  const focusUser = useAdminScopeStore((s) => s.focusUser);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Non-admin — render nothing. User role has no "scope" concept (backend
  // would reject a scope override anyway).
  const isAdmin = scope.role === "admin";

  // Fetch user list only when the dropdown is opened — keeps page-load
  // footprint small; admin will usually stay in "all" mode most sessions.
  const { data: users = [] } = useQuery({
    queryKey: ["users-list", "admin-scope-switcher"],
    queryFn: fetchUsers,
    enabled: isAdmin && open,
    staleTime: 60_000,
  });

  // Derive currently-focused user name from the list (for the button label).
  const focusedUser = useMemo(
    () => users.find((u) => u.id === focusedUserId) ?? null,
    [users, focusedUserId],
  );

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isAdmin) return null;

  const isAllMode = mode === "all";
  const buttonLabel = isAllMode
    ? "Tüm Kullanıcılar"
    : focusedUser?.display_name || focusedUser?.email || "Kullanıcı: …";

  const filteredUsers = users
    .filter((u) => u.status === "active")
    .filter((u) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      data-testid="admin-scope-switcher"
      data-mode={mode}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={
          isAllMode
            ? "Admin şu an tüm kullanıcıların kapsamını görüyor"
            : `Admin şu an "${buttonLabel}" kapsamına odaklı`
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="admin-scope-switcher-button"
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-md text-sm",
          "border border-border-subtle bg-surface-inset",
          "transition-colors duration-fast cursor-pointer",
          "hover:border-brand-400 hover:ring-2 hover:ring-brand-400/10",
          open && "border-brand-400 ring-2 ring-brand-400/10",
        )}
      >
        <ScopeAvatar
          label={isAllMode ? "∀" : buttonLabel}
          variant={isAllMode ? "all" : "user"}
        />
        <div className="min-w-0 text-left">
          <div className="text-[10px] leading-none text-neutral-500 mb-0.5">
            Kapsam
          </div>
          <div
            className={cn(
              "text-xs font-medium truncate max-w-[160px]",
              isAllMode ? "text-brand-700" : "text-neutral-700",
            )}
            data-testid="admin-scope-switcher-label"
          >
            {buttonLabel}
          </div>
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
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          data-testid="admin-scope-switcher-dropdown"
          className={cn(
            "absolute right-0 top-full mt-1 z-50",
            "w-64 bg-surface-card border border-border-subtle rounded-lg shadow-lg",
            "py-1 max-h-[70vh] overflow-auto",
          )}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Yönetici Kapsamı
          </div>

          {/* "All users" option */}
          <button
            type="button"
            role="option"
            aria-selected={isAllMode}
            data-testid="admin-scope-switcher-all"
            onClick={() => {
              setAll();
              setOpen(false);
              setQuery("");
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-left",
              "transition-colors duration-fast cursor-pointer",
              isAllMode ? "bg-brand-50" : "hover:bg-surface-hover",
            )}
          >
            <ScopeAvatar label="∀" variant="all" />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-sm truncate",
                  isAllMode ? "font-semibold text-brand-700" : "font-medium text-neutral-800",
                )}
              >
                Tüm Kullanıcılar
              </div>
              <div className="text-[10px] text-neutral-500 truncate">
                Admin-geniş görüntü
              </div>
            </div>
            {isAllMode && (
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" aria-hidden="true" />
            )}
          </button>

          {/* Search box (only when 5+ users — otherwise distracting) */}
          {users.length >= 5 && (
            <div className="px-3 py-1.5">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kullanıcı ara..."
                data-testid="admin-scope-switcher-search"
                className={cn(
                  "w-full px-2 py-1 text-xs",
                  "border border-border-subtle rounded-md bg-surface-inset",
                  "focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400",
                )}
              />
            </div>
          )}

          <div className="border-t border-border-subtle my-1" />

          <div className="px-3 py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Kullanıcıya Odaklan
          </div>

          {filteredUsers.length === 0 && (
            <div className="px-3 py-2 text-xs text-neutral-500 italic">
              {users.length === 0 ? "Kullanıcı listesi yüklenemedi." : "Eşleşen kullanıcı yok."}
            </div>
          )}

          {filteredUsers.map((u: UserResponse) => {
            const selected = mode === "user" && focusedUserId === u.id;
            return (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={selected}
                data-testid={`admin-scope-switcher-user-${u.id}`}
                onClick={() => {
                  focusUser(u.id);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-left",
                  "transition-colors duration-fast cursor-pointer",
                  selected ? "bg-brand-50" : "hover:bg-surface-hover",
                )}
              >
                <ScopeAvatar label={u.display_name || u.email} variant="user" />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm truncate",
                      selected
                        ? "font-semibold text-brand-700"
                        : "font-medium text-neutral-800",
                    )}
                  >
                    {u.display_name || u.email}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    {u.email}
                    {u.role === "admin" && (
                      <span className="ml-1 text-brand-600">· admin</span>
                    )}
                  </div>
                </div>
                {selected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}

          {/* Footer: quick "clear" action when focused */}
          {mode === "user" && (
            <>
              <div className="border-t border-border-subtle my-1" />
              <button
                type="button"
                data-testid="admin-scope-switcher-clear"
                onClick={() => {
                  setAll();
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-xs",
                  "text-neutral-600 hover:bg-surface-hover cursor-pointer",
                )}
              >
                ← Tüm Kullanıcılar görünümüne dön
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
