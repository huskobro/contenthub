import { NavLink } from "react-router-dom";

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
        width: "200px",
        borderRight: "1px solid #e2e8f0",
        padding: "1rem 0",
        background: "#f8fafc",
        flexShrink: 0,
      }}
    >
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li key={item.label}>
            {item.section ? (
              <div
                style={{
                  padding: "0.75rem 1.25rem 0.25rem",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {item.label}
              </div>
            ) : item.to ? (
              <NavLink
                to={item.to}
                style={({ isActive }) => ({
                  display: "block",
                  padding: "0.5rem 1.25rem",
                  textDecoration: "none",
                  color: isActive ? "#1e40af" : "#334155",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "#eff6ff" : "transparent",
                })}
              >
                {item.label}
              </NavLink>
            ) : (
              <span
                style={{
                  display: "block",
                  padding: "0.5rem 1.25rem",
                  color: "#94a3b8",
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
