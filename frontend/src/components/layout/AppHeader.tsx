import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  area: "Admin" | "User";
}

const AREA_LABELS: Record<string, { label: string; switchLabel: string; switchTo: string }> = {
  Admin: { label: "Yonetim Paneli", switchLabel: "Kullanici Paneli", switchTo: "/user" },
  User: { label: "Kullanici Paneli", switchLabel: "Yonetim Paneli", switchTo: "/admin" },
};

export function AppHeader({ area }: AppHeaderProps) {
  const navigate = useNavigate();
  const config = AREA_LABELS[area];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 1.25rem",
        borderBottom: "1px solid #e2e8f0",
        background: "#fff",
      }}
    >
      <strong>ContentHub</strong>
      <span style={{ color: "#64748b", fontSize: "0.875rem" }} data-testid="header-area-label">
        {config.label}
      </span>
      <div style={{ flex: 1 }} />
      <button
        onClick={() => navigate(config.switchTo)}
        data-testid="header-panel-switch"
        style={{
          padding: "0.25rem 0.75rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "#475569",
          background: "transparent",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {config.switchLabel}
      </button>
    </header>
  );
}
