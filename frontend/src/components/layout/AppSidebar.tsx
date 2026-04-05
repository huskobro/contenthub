import { NavLink } from "react-router-dom";
import { colors, typography, spacing, transition, zIndex, layout } from "../../components/design-system/tokens";

interface NavItem {
  label: string;
  to?: string;
  section?: boolean;
}

interface AppSidebarProps {
  items: NavItem[];
}

export function AppSidebar({ items }: AppSidebarProps) {
  return (
    <nav
      style={{
        width: layout.sidebarWidth,
        background: colors.surface.sidebar,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: zIndex.sidebar,
        minHeight: "100vh",
      }}
    >
      {/* Brand area */}
      <div
        style={{
          padding: `${spacing[5]} ${spacing[4]}`,
          borderBottom: `1px solid ${colors.neutral[800]}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing[3] }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: colors.brand[600],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.neutral[0],
              fontSize: typography.size.sm,
              fontWeight: typography.weight.bold,
              fontFamily: typography.fontFamily,
              letterSpacing: "0.02em",
            }}
          >
            CH
          </div>
          <span
            style={{
              color: colors.neutral[0],
              fontSize: typography.size.md,
              fontWeight: typography.weight.semibold,
              fontFamily: typography.fontFamily,
              letterSpacing: "-0.01em",
            }}
          >
            ContentHub
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: `${spacing[2]} 0`,
          flex: 1,
          overflowY: "auto",
        }}
      >
        {items.map((item, idx) => (
          <li key={item.to ?? `section-${idx}`}>
            {item.section ? (
              <div
                style={{
                  padding: `${spacing[4]} ${spacing[4]} ${spacing[1]} ${spacing[4]}`,
                  fontSize: typography.size.xs,
                  fontWeight: typography.weight.semibold,
                  fontFamily: typography.fontFamily,
                  color: colors.neutral[500],
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {item.label}
              </div>
            ) : item.to ? (
              <NavLink
                to={item.to}
                style={({ isActive }) => ({
                  display: "block",
                  padding: `${spacing[2]} ${spacing[4]}`,
                  textDecoration: "none",
                  fontSize: typography.size.base,
                  fontFamily: typography.fontFamily,
                  fontWeight: isActive ? typography.weight.medium : typography.weight.normal,
                  color: isActive ? colors.neutral[0] : colors.neutral[400],
                  background: isActive ? colors.surface.sidebarActive : "transparent",
                  borderLeft: isActive
                    ? `2px solid ${colors.brand[500]}`
                    : "2px solid transparent",
                  transition: `background ${transition.fast}, color ${transition.fast}`,
                  cursor: "pointer",
                })}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  if (!target.classList.contains("active")) {
                    target.style.background = colors.surface.sidebarHover;
                  }
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget;
                  if (!target.classList.contains("active")) {
                    target.style.background = "transparent";
                  }
                }}
              >
                {item.label}
              </NavLink>
            ) : (
              <span
                style={{
                  display: "block",
                  padding: `${spacing[2]} ${spacing[4]}`,
                  color: colors.neutral[600],
                  fontSize: typography.size.base,
                  fontFamily: typography.fontFamily,
                  cursor: "default",
                }}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
