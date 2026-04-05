import { useNavigate } from "react-router-dom";
import { useCommandPaletteStore } from "../../stores/commandPaletteStore";
import { colors, typography, spacing, radius, transition, zIndex, layout } from "../../components/design-system/tokens";

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
        background: colors.surface.card,
        zIndex: zIndex.header,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: colors.neutral[600],
          fontSize: typography.size.md,
          fontWeight: typography.weight.medium,
          fontFamily: typography.fontFamily,
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
          background: colors.neutral[50],
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.md,
          cursor: "pointer",
          transition: `background ${transition.fast}, border-color ${transition.fast}`,
          marginRight: spacing[3],
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.neutral[100];
          e.currentTarget.style.borderColor = colors.border.strong;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.neutral[50];
          e.currentTarget.style.borderColor = colors.border.default;
        }}
      >
        <span style={{ color: colors.neutral[400] }}>Ara veya komut...</span>
        <kbd
          style={{
            fontSize: typography.size.xs,
            fontFamily: typography.monoFamily,
            background: colors.surface.card,
            padding: "0.1rem 0.35rem",
            borderRadius: radius.sm,
            border: `1px solid ${colors.border.subtle}`,
            color: colors.neutral[400],
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
          transition: `background ${transition.fast}, border-color ${transition.fast}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.neutral[50];
          e.currentTarget.style.borderColor = colors.border.strong;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = colors.border.default;
        }}
      >
        {config.switchLabel}
      </button>
    </header>
  );
}
