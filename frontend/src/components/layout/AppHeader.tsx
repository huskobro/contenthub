import { useNavigate } from "react-router-dom";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { NotificationBell } from "../design-system/NotificationCenter";
import { cn } from "../../lib/cn";

interface AppHeaderProps {
  area: "Admin" | "User";
}

const AREA_LABELS: Record<string, { label: string; switchLabel: string; switchTo: string; switchTitle: string }> = {
  Admin: {
    label: "Yonetim Paneli",
    switchLabel: "Kullanici Paneline Gec",
    switchTo: "/user",
    switchTitle: "Kullanici paneline gecis yapin",
  },
  User: {
    label: "Kullanici Paneli",
    switchLabel: "Yonetim Paneline Gec",
    switchTo: "/admin",
    switchTitle: "Yonetim paneline gecis yapin",
  },
};

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

      <div className="flex-1" />

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
