interface AppHeaderProps {
  area: "Admin" | "User";
}

export function AppHeader({ area }: AppHeaderProps) {
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
      <span style={{ color: "#64748b", fontSize: "0.875rem" }}>{area}</span>
    </header>
  );
}
