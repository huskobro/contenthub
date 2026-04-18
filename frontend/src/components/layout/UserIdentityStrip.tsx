/**
 * UserIdentityStrip — Redesign REV-2 / P1.2.
 *
 * User panelinde (UserLayout + surface user shell'leri) content-top
 * sticky şeriti. Kullanıcıya "kim olduğunu" ve "kendi alanında
 * olduğunu" görsel olarak hissettirir.
 *
 * İçerik:
 *   👤 <Display Name>  •  Kendi alanım  •  🔔 N yeni  📅 M bugün
 *
 * Veri kaynakları:
 *   - `useCurrentUser()` — isim + avatar seed + rol
 *   - `useNotifications({ mode: "user" })` → `unreadCount` (zaten user scope'una
 *     bağlı, kullanıcı kendi bildirimini görür)
 *   - `fetchCalendarEvents({ start, end, owner_user_id })` — bugün sayısı
 *     (admin wrapper'ı kullanılmıyor; strip sadece user shell'inde render
 *     olur, dolayısıyla owner_user_id = current user id)
 *
 * Özel durumlar:
 *   - Admin role kullanıcı bu yüzey üzerinden kendi admin kimliğiyle USER
 *     panelinde geziniyorsa, strip onun kimliğini göstermez — user panel,
 *     user bakışı için tasarlanmıştır. Bu yüzden `role === "admin"` ise
 *     strip RENDER OLMAZ (admin zaten AppHeader'daki AdminScopeSwitcher ve
 *     panel switch etiketiyle nerede olduğunu görür).
 *
 * CLAUDE.md uyumu:
 *   - Hidden behavior yok: tüm değerler görünür, title attribute'larında
 *     açıklama.
 *   - Hardcoded davranış yok: counter'lar canlı veriden.
 *   - Parallel pattern yok: panelin tek kimlik şeridi.
 *   - Server-state React Query, client-state useAuthStore/notificationStore —
 *     ayrımı bozulmuyor.
 *   - Design tokens: surface-card, border-subtle, brand-*, info-* — guide'a
 *     uygun; text-neutral-100/200 iç renkleri yok.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useNotifications } from "../../hooks/useNotifications";
import { fetchCalendarEvents } from "../../api/calendarApi";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Basit deterministik avatar rengi — display name hash'ine göre.
 * AdminScopeSwitcher'dakine paralel (identity görsel dili ortak), ancak
 * `UserIdentityStrip` kendi iç helper'ı; iki bileşen ayrı ilgi alanları
 * olduğu için import'la bağlamak yerine küçük bir kopya tutuyoruz — kod
 * ölçeği 5 satır, abstraction buna değmez.
 */
const AVATAR_COLORS = [
  "bg-brand-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-violet-600",
  "bg-cyan-600",
];

function pickAvatarColor(label: string): string {
  const seed =
    label.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length;
  return AVATAR_COLORS[seed];
}

function todayRange(): { start: string; end: string } {
  // Local gün başı → gün sonu, ISO string.
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UserIdentityStripProps {
  /** Opsiyonel ek class — shell'e özel offset/padding için. */
  className?: string;
}

export function UserIdentityStrip({ className }: UserIdentityStripProps) {
  const { user, isReady } = useCurrentUser();
  const { unreadCount } = useNotifications({ mode: "user" });

  // Admin rol: strip render etme (bkz. başlık notu).
  const isEndUser = isReady && user?.role !== "admin";

  const { start, end } = useMemo(todayRange, []);

  // Bugünkü etkinlikler — yalnız user shell'i için ve sadece user id
  // belliyken çekilir.
  const todayEventsQuery = useQuery({
    queryKey: [
      "calendar-events",
      "user-identity-strip",
      { owner_user_id: user?.id, start, end },
    ],
    queryFn: () =>
      fetchCalendarEvents({
        start_date: start,
        end_date: end,
        owner_user_id: user!.id,
      }),
    enabled: Boolean(isEndUser && user?.id),
    staleTime: 60_000,
  });

  if (!isEndUser || !user) return null;

  const displayName = user.display_name || user.email || "Sen";
  const letter = displayName[0]?.toUpperCase() ?? "?";
  const avatarColor = pickAvatarColor(displayName);
  const todayCount = todayEventsQuery.data?.length ?? 0;

  return (
    <div
      role="banner"
      data-testid="user-identity-strip"
      className={cn(
        "sticky top-0 z-40 h-10 flex items-center gap-3 px-4",
        "border-b border-border-subtle bg-surface-card/95 backdrop-blur",
        className,
      )}
      aria-label={`Kullanıcı kimliği: ${displayName}, kendi alanınız`}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
          "text-[11px] font-semibold text-white",
          avatarColor,
        )}
        aria-hidden="true"
        data-testid="user-identity-strip-avatar"
      >
        {letter}
      </div>

      {/* Name */}
      <span
        className="text-sm text-neutral-900 font-medium truncate max-w-[200px]"
        data-testid="user-identity-strip-name"
        title={displayName}
      >
        {displayName}
      </span>

      <span className="text-neutral-300 select-none" aria-hidden="true">
        •
      </span>

      {/* Scope chip */}
      <span
        className="text-xs text-neutral-500"
        data-testid="user-identity-strip-scope"
        title="Sadece kendi içerik, iş ve bildirimlerinizi görürsünüz"
      >
        Kendi alanım
      </span>

      <div className="flex-1" />

      {/* Notification counter */}
      {unreadCount > 0 && (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
            "bg-info-light text-info-dark text-xs font-medium",
          )}
          data-testid="user-identity-strip-notif"
          title={`${unreadCount} okunmamış bildirim`}
        >
          <span aria-hidden="true">🔔</span>
          <span>
            {unreadCount} <span className="text-neutral-500">yeni</span>
          </span>
        </span>
      )}

      {/* Today events counter */}
      {todayCount > 0 && (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
            "bg-brand-50 text-brand-700 text-xs font-medium",
          )}
          data-testid="user-identity-strip-today"
          title={`Bugün takviminizde ${todayCount} olay var`}
        >
          <span aria-hidden="true">📅</span>
          <span>
            {todayCount} <span className="text-neutral-500">bugün</span>
          </span>
        </span>
      )}
    </div>
  );
}
