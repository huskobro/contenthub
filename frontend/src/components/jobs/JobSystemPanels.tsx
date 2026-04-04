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
  const deferred = (milestone: string) => (
    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.75rem" }}>
      {milestone} milestone'unda aktif edilecektir.
    </p>
  );

  return (
    <div>
      <SystemCard title="Logs">{deferred("M12")}</SystemCard>
      <SystemCard title="Artifacts">{deferred("M12")}</SystemCard>
      <SystemCard title="Provider Trace">{deferred("M12")}</SystemCard>
    </div>
  );
}
