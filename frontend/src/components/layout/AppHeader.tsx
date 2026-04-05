import { useNavigate } from "react-router-dom";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { colors, typography, spacing, radius, shadow, transition, zIndex, layout } from "../../components/design-system/tokens";

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
      style={{
        display: "flex",
        alignItems: "center",
        height: layout.headerHeight,
        padding: `0 ${spacing[6]}`,
        borderBottom: `1px solid ${colors.border.subtle}`,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: shadow.sm,
        zIndex: zIndex.header,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: colors.neutral[600],
          fontSize: typography.size.md,
          fontWeight: typography.weight.semibold,
          fontFamily: typography.headingFamily,
          letterSpacing: "-0.01em",
        }}
        data-testid="header-area-label"
      >
        {config.label}
      </span>

      <div style={{ flex: 1 }} />

      {/* Command Palette trigger */}
      <button
        onClick={() => useCommandPaletteStore.getState().open()}
        data-testid="header-command-palette"
        title="Komut Paleti (⌘K)"
        aria-label="Komut Paleti"
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing[2],
          padding: `${spacing[1]} ${spacing[3]}`,
          fontSize: typography.size.sm,
          fontFamily: typography.fontFamily,
          color: colors.neutral[500],
          background: colors.surface.inset,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.lg,
          cursor: "pointer",
          transition: `background ${transition.fast}, border-color ${transition.fast}, box-shadow ${transition.fast}`,
          marginRight: spacing[3],
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.brand[400];
          e.currentTarget.style.boxShadow = `0 0 0 2px rgba(76,110,245,0.1)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.border.subtle;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <span style={{ color: colors.neutral[400] }}>Ara veya komut...</span>
        <kbd
          style={{
            fontSize: typography.size.xs,
            fontFamily: typography.monoFamily,
            background: colors.neutral[100],
            padding: `${spacing[0]} ${spacing[1]}`,
            borderRadius: radius.sm,
            border: `1px solid ${colors.border.subtle}`,
            boxShadow: shadow.xs,
            color: colors.neutral[500],
            lineHeight: 1.4,
          }}
        >
          ⌘K
        </kbd>
      </button>

      <button
        onClick={() => navigate(config.switchTo)}
        data-testid="header-panel-switch"
        title={config.switchTitle}
        aria-label={config.switchTitle}
        style={{
          padding: `${spacing[1]} ${spacing[3]}`,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.medium,
          fontFamily: typography.fontFamily,
          color: colors.neutral[600],
          background: "transparent",
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.md,
          cursor: "pointer",
          transition: `background ${transition.fast}, border-color ${transition.fast}, box-shadow ${transition.fast}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.neutral[50];
          e.currentTarget.style.borderColor = colors.brand[400];
          e.currentTarget.style.boxShadow = `0 0 0 2px rgba(76,110,245,0.08)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = colors.border.default;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {config.switchLabel}
      </button>
    </header>
  );
}
