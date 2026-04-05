import { NavLink } from "react-router-dom";
import { colors, typography, spacing, radius, transition, zIndex, layout } from "../../components/design-system/tokens";
import { useUIStore } from "../../stores/uiStore";

interface NavItem {
  label: string;
  to?: string;
  section?: boolean;
}

interface AppSidebarProps {
  items: NavItem[];
}

export function AppSidebar({ items }: AppSidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const sidebarWidth = collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth;

  return (
    <nav
      style={{
        width: sidebarWidth,
        background: colors.surface.sidebar,
        backgroundImage: `linear-gradient(180deg, rgba(76,110,245,0.03) 0%, transparent 40%)`,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: zIndex.sidebar,
        minHeight: "100vh",
        transition: `width ${transition.normal}`,
        overflow: "hidden",
      }}
    >
      {/* Brand area */}
      <div
        style={{
          padding: collapsed ? `${spacing[5]} ${spacing[3]}` : `${spacing[5]} ${spacing[4]}`,
          borderBottom: `1px solid ${colors.neutral[800]}`,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: spacing[3],
          transition: `padding ${transition.normal}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing[3], minWidth: 0 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: radius.lg,
              background: `linear-gradient(135deg, ${colors.brand[500]}, ${colors.brand[700]})`,
              boxShadow: `0 0 12px rgba(76,110,245,0.3)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.neutral[0],
              fontSize: typography.size.sm,
              fontWeight: typography.weight.bold,
              fontFamily: typography.fontFamily,
              letterSpacing: "0.02em",
              flexShrink: 0,
            }}
          >
            CH
          </div>
          {!collapsed && (
            <span
              style={{
                color: colors.neutral[0],
                fontSize: typography.size.md,
                fontWeight: typography.weight.semibold,
                fontFamily: typography.fontFamily,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              ContentHub
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? "Kenar çubuğunu genişlet" : "Kenar çubuğunu daralt"}
          data-testid="sidebar-collapse-toggle"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: spacing[1],
            borderRadius: radius.sm,
            color: colors.neutral[500],
            fontSize: typography.size.sm,
            lineHeight: 1,
            flexShrink: 0,
            transition: `color ${transition.fast}, background ${transition.fast}`,
            display: collapsed ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.neutral[200];
            e.currentTarget.style.background = colors.surface.sidebarHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.neutral[500];
            e.currentTarget.style.background = "none";
          }}
        >
          &#x2039;
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={toggleSidebar}
          aria-label="Kenar çubuğunu genişlet"
          data-testid="sidebar-expand-toggle"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: `${spacing[2]} 0`,
            borderRadius: radius.sm,
            color: colors.neutral[500],
            fontSize: typography.size.sm,
            lineHeight: 1,
            transition: `color ${transition.fast}, background ${transition.fast}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.neutral[200];
            e.currentTarget.style.background = colors.surface.sidebarHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.neutral[500];
            e.currentTarget.style.background = "none";
          }}
        >
          &#x203a;
        </button>
      )}

      {/* Navigation */}
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: `${spacing[2]} ${spacing[1]}`,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {items.map((item, idx) => (
          <li key={item.to ?? `section-${idx}`}>
            {item.section ? (
              !collapsed && (
                <div
                  style={{
                    padding: `${spacing[4]} ${spacing[3]} ${spacing[1]} ${spacing[3]}`,
                    fontSize: typography.size.xs,
                    fontWeight: typography.weight.semibold,
                    fontFamily: typography.fontFamily,
                    color: colors.neutral[400],
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </div>
              )
            ) : item.to ? (
              <NavLink
                to={item.to}
                title={collapsed ? item.label : undefined}
                style={({ isActive }) => ({
                  display: "block",
                  padding: collapsed
                    ? `${spacing[2]} ${spacing[2]}`
                    : `${spacing[2]} ${spacing[3]}`,
                  margin: `1px 0`,
                  textDecoration: "none",
                  fontSize: collapsed ? typography.size.xs : typography.size.base,
                  fontFamily: typography.fontFamily,
                  fontWeight: isActive ? typography.weight.medium : typography.weight.normal,
                  color: isActive ? colors.brand[300] : colors.neutral[400],
                  background: isActive ? colors.surface.sidebarActive : "transparent",
                  borderLeft: isActive
                    ? `3px solid ${colors.brand[400]}`
                    : "3px solid transparent",
                  borderRadius: radius.sm,
                  transition: `background ${transition.fast}, color ${transition.fast}, border-color ${transition.fast}`,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textAlign: collapsed ? "center" : "left",
                })}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  if (!target.classList.contains("active")) {
                    target.style.background = colors.surface.sidebarHover;
                    target.style.color = colors.neutral[200];
                  }
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget;
                  if (!target.classList.contains("active")) {
                    target.style.background = "transparent";
                    target.style.color = colors.neutral[400];
                  }
                }}
              >
                {collapsed ? item.label.charAt(0) : item.label}
              </NavLink>
            ) : (
              <span
                style={{
                  display: "block",
                  padding: `${spacing[2]} ${spacing[3]}`,
                  color: colors.neutral[600],
                  fontSize: typography.size.base,
                  fontFamily: typography.fontFamily,
                  cursor: "default",
                  whiteSpace: "nowrap",
                  borderRadius: radius.sm,
                }}
              >
                {collapsed ? item.label.charAt(0) : item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
