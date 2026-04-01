function SystemCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        background: "#fafbfc",
        padding: "1rem",
        marginBottom: "1rem",
      }}
    >
      <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9375rem", color: "#0f172a" }}>{title}</h4>
      {children}
    </div>
  );
}

export function JobSystemPanels() {
  const notice = (
    <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
      Bu veri henüz backend tarafından sağlanmıyor.
    </p>
  );

  return (
    <div>
      <SystemCard title="Logs">{notice}</SystemCard>
      <SystemCard title="Artifacts">{notice}</SystemCard>
      <SystemCard title="Provider Trace">{notice}</SystemCard>
    </div>
  );
}
