import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { useAuthStore } from "../../stores/authStore";
import { NotificationBell } from "../design-system/NotificationCenter";
import { SurfaceActiveBadge } from "../surfaces/SurfaceActiveBadge";
import { AdminScopeSwitcher } from "./AdminScopeSwitcher";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// System clock — ticks every second, uses ui.timezone from settings
// ---------------------------------------------------------------------------

function useSystemClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getTimezone(): string {
  try {
    return localStorage.getItem("ui.timezone") || "Europe/Istanbul";
  } catch {
    return "Europe/Istanbul";
  }
}

function SystemClock() {
  const now = useSystemClock();
  const tz = getTimezone();

  const timeStr = now.toLocaleString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: tz,
  });

  const dateStr = now.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: tz,
  });

  // Short tz label
  const tzShort = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;

  return (
    <div
      className="flex items-center gap-1.5 mr-3 select-none"
      title={`Sistem saati (${tz})`}
      data-testid="header-system-clock"
    >
      <span className="text-sm font-mono font-semibold text-neutral-600 tabular-nums tracking-tight">
        {timeStr}
      </span>
      <span className="text-[10px] text-neutral-400 leading-none">
        {dateStr}
      </span>
      <span className="text-[9px] text-neutral-300 leading-none">
        {tzShort}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface AppHeaderProps {
  area: "Admin" | "User";
}

// F48 fix: panel switch copy standardizasyonu — tum surface'lerde
// ayni etiket: "Yönetim Paneli" (admin'e git) / "Kullanıcı Paneli"
// (user'a git). Legacy AppHeader daha once "Yonetim Paneline Gec" /
// "Kullanici Paneline Gec" kullaniyordu; birincil fix-pack'te atlanmis.
const AREA_LABELS: Record<string, { label: string; switchLabel: string; switchTo: string; switchTitle: string }> = {
  Admin: {
    label: "Yönetim Paneli",
    switchLabel: "Kullanıcı Paneli",
    switchTo: "/user",
    switchTitle: "Kullanıcı Paneli",
  },
  User: {
    label: "Kullanıcı Paneli",
    switchLabel: "Yönetim Paneli",
    switchTo: "/admin",
    switchTitle: "Yönetim Paneli",
  },
};

// ---------------------------------------------------------------------------
// Role hint — "ana roluniz" (Faz 4C)
// ---------------------------------------------------------------------------

/**
 * Panel gecis butonunun sol ustunde kucuk bir "Ana roluniz: Admin / Kullanici"
 * etiketi. Kullanicinin auth role'u ile o anda bulundugu panelin farkli
 * oldugu durumlarda netlik saglar (ornek: admin user paneline gezmiyor —
 * hala admin'dir, sadece panel baska). Bu etiket YALNIZ bir bilgi rozetidir;
 * hicbir seyi degistirmez, navigation'a mudahale etmez.
 */
function RoleHintBadge() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  const isAdminRole = user.role === "admin" || user.role === "superadmin";
  const label = isAdminRole ? "Admin" : "Kullanici";
  const tooltip = `Ana roluniz: ${label}. Panel gecisi kimliginizi degistirmez, sadece hangi panelde calistiginiz degisir.`;
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 mr-2 rounded-md border border-border-subtle bg-surface-inset select-none"
      title={tooltip}
      aria-label={tooltip}
      data-testid="header-role-hint"
      data-role={isAdminRole ? "admin" : "user"}
    >
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full",
          isAdminRole ? "bg-brand-500" : "bg-success",
        )}
        aria-hidden="true"
      />
      <span className="text-[10px] font-medium text-neutral-500 whitespace-nowrap">
        Rol: {label}
      </span>
    </div>
  );
}

export function AppHeader({ area }: AppHeaderProps) {
  const navigate = useNavigate();
  const config = AREA_LABELS[area];

  return (
    <header
      className="flex items-center h-header px-4 border-b border-border-subtle backdrop-blur-[16px] z-header shrink-0 relative"
      style={{ backgroundColor: "color-mix(in srgb, var(--ch-surface-card) 82%, transparent)" }}
    >
      {/* Subtle bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--ch-brand-400) 15%, transparent) 50%, transparent 100%)" }} />
      <span
        className="text-neutral-600 text-md font-semibold font-heading tracking-[-0.01em]"
        data-testid="header-area-label"
      >
        {config.label}
      </span>

      {/* Faz 4C: aktif surface rozeti — area label'in hemen yaninda. */}
      <SurfaceActiveBadge area={area} className="ml-3" />

      {/* Redesign REV-2 / P1.1:
          Admin panelde kapsam seçici. adminScopeStore'a bağlı "Tüm
          Kullanıcılar / Kullanıcı: X" toggle'ı — useActiveScope() üzerinden
          tüm scope-aware React Query anahtarlarına akar. Non-admin
          rollerde hiç render olmaz (component içinde guard var), ancak
          biz area="Admin" ile de ek olarak sınırlıyoruz: identity
          impersonation ile değil, gerçek auth role'ü ile admin olan
          oturumda yalnız admin panelinde anlamlı. */}
      {area === "Admin" && <AdminScopeSwitcher className="ml-3" />}

      <div className="flex-1" />

      {/* System Clock */}
      <SystemClock />

      {/* Command Palette trigger */}
      <button
        onClick={() => useCommandPaletteStore.getState().open()}
        data-testid="header-command-palette"
        title="Komut Paleti (⌘K)"
        aria-label="Komut Paleti"
        className="flex items-center gap-2 px-3 py-1 text-sm font-body text-neutral-500 bg-surface-inset border border-border-subtle rounded-lg cursor-pointer mr-3 transition-all duration-fast hover:border-brand-400 hover:ring-2 hover:ring-brand-400/10"
      >
        <span className="text-neutral-400">Ara veya komut...</span>
        <kbd className="text-xs font-mono bg-neutral-100 px-1 py-0 rounded-sm border border-border-subtle shadow-xs text-neutral-500 leading-[1.4]">
          ⌘K
        </kbd>
      </button>

      {/* Notification Bell */}
      <NotificationBell className="mr-3" />

      {/* Faz 4C: kullanicinin ana role'unu kisaca belirt. */}
      <RoleHintBadge />

      <button
        onClick={() => navigate(config.switchTo)}
        data-testid="header-panel-switch"
        title={config.switchTitle}
        aria-label={config.switchTitle}
        className="px-3 py-1 text-sm font-medium font-body text-neutral-600 bg-transparent border border-border rounded-md cursor-pointer transition-all duration-fast hover:bg-neutral-50 hover:border-brand-400 hover:ring-2 hover:ring-brand-400/10"
      >
        {config.switchLabel}
      </button>
    </header>
  );
}
